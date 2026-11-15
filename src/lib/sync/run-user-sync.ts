import { db } from "@/db";
import {
  watchedChannels,
  channelRules,
  targetPlaylists,
  processedVideos,
  syncLogs,
} from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getValidYouTubeAccessToken } from "@/lib/youtube/token";
import { getLatestChannelVideos, type RSSVideo } from "@/lib/youtube/rss";
import { addVideoToPlaylist, getPlaylistVideoIds, getVideoDurations } from "@/lib/youtube/api";
import { matchesTitleFilter, isTitleExcluded } from "@/lib/utils";

/** Ventana móvil (stateless) de detección de videos nuevos. */
const WINDOW_MS = 48 * 60 * 60 * 1000;
/** Canales procesados en paralelo. */
const CHUNK_SIZE = 10;

export interface SyncResult {
  syncLogId: string | null;
  channelsChecked: number;
  videosFound: number;
  videosAdded: number;
  videosFiltered: number;
  videosErrored: number;
  /** Videos que ya habían sido evaluados en una ejecución anterior (no se reprocesan). */
  videosSkipped: number;
  quotaUsed: number;
}

type VideoStatus = "added" | "filtered" | "error";

interface RuleRow {
  ruleId: string;
  filterType: "all" | "title_contains" | "title_any_of";
  filterValue: string | null;
  excludeValue: string | null;
  includeShorts: boolean;
  targetPlaylistTableId: string;
  targetPlaylistId: string;
}

/**
 * Ejecuta la sincronización completa de un usuario (usada por el cron y por la sincronización manual).
 *
 * - Crea el registro de la ejecución al inicio, así cada video procesado queda vinculado a ella
 *   y las ejecuciones simultáneas pueden detectarse.
 * - Los videos ya evaluados para una regla en ejecuciones anteriores se omiten (excepto los que
 *   terminaron en error, que se reintentan). Antes, la ventana de 48hs hacía que cada video se
 *   reevaluara al día siguiente y su estado "agregado" se pisara con "ya existía en la lista".
 */
export async function runUserSync(
  userId: string,
  executionType: "auto" | "manual"
): Promise<SyncResult> {
  const startedAt = new Date();
  const windowStart = new Date(startedAt.getTime() - WINDOW_MS);

  const result: SyncResult = {
    syncLogId: null,
    channelsChecked: 0,
    videosFound: 0,
    videosAdded: 0,
    videosFiltered: 0,
    videosErrored: 0,
    videosSkipped: 0,
    quotaUsed: 0,
  };

  const userChannels = await db
    .select()
    .from(watchedChannels)
    .where(and(eq(watchedChannels.userId, userId), eq(watchedChannels.isActive, true)));

  if (userChannels.length === 0) return result;

  const [log] = await db
    .insert(syncLogs)
    .values({
      userId,
      executionType,
      windowStart,
      windowEnd: startedAt,
      startedAt,
    })
    .returning({ id: syncLogs.id });
  const syncLogId = log.id;
  result.syncLogId = syncLogId;

  // Cache de IDs de videos ya presentes en cada playlist de YouTube
  const playlistVideoIdsCache = new Map<string, Promise<Set<string>>>();

  const record = async (
    video: RSSVideo,
    rule: RuleRow,
    status: VideoStatus,
    errorMessage: string | null
  ) => {
    const now = new Date();
    try {
      await db
        .insert(processedVideos)
        .values({
          videoId: video.videoId,
          channelRuleId: rule.ruleId,
          targetPlaylistId: rule.targetPlaylistTableId,
          videoTitle: video.title,
          videoUrl: video.url,
          publishedAt: video.publishedAt,
          status,
          errorMessage,
          syncLogId,
          processedAt: now,
        })
        .onConflictDoUpdate({
          // Solo ocurre al reintentar un video que antes terminó en error
          target: [processedVideos.videoId, processedVideos.channelRuleId],
          set: { status, errorMessage, syncLogId, processedAt: now },
        });
    } catch (e) {
      console.error("Error guardando video procesado:", e);
    }
  };

  const processChannel = async (channel: (typeof userChannels)[number], accessToken: string) => {
    result.channelsChecked++;

    const rules: RuleRow[] = await db
      .select({
        ruleId: channelRules.id,
        filterType: channelRules.filterType,
        filterValue: channelRules.filterValue,
        excludeValue: channelRules.excludeValue,
        includeShorts: channelRules.includeShorts,
        targetPlaylistTableId: targetPlaylists.id,
        targetPlaylistId: targetPlaylists.playlistId,
      })
      .from(channelRules)
      .innerJoin(targetPlaylists, eq(channelRules.targetPlaylistId, targetPlaylists.id))
      .where(
        and(
          eq(channelRules.watchedChannelId, channel.id),
          eq(channelRules.isActive, true),
          eq(targetPlaylists.userId, userId)
        )
      );

    if (rules.length === 0) return;

    let channelVideos: RSSVideo[];
    let videoDurations = new Map<string, number>();
    try {
      const allRecentVideos = await getLatestChannelVideos(channel.channelId);
      channelVideos = allRecentVideos.filter((v) => v.publishedAt >= windowStart);
    } catch (feedErr) {
      console.error(`Error al obtener RSS del canal ${channel.channelName}:`, feedErr);
      return;
    }

    result.videosFound += channelVideos.length;
    if (channelVideos.length === 0) {
      await db
        .update(watchedChannels)
        .set({ lastCheckedAt: new Date() })
        .where(eq(watchedChannels.id, channel.id));
      return;
    }

    // Estados previos de estos videos para estas reglas (una sola consulta por canal)
    const videoIds = channelVideos.map((v) => v.videoId);
    const previous = await db
      .select({
        videoId: processedVideos.videoId,
        channelRuleId: processedVideos.channelRuleId,
        status: processedVideos.status,
      })
      .from(processedVideos)
      .where(
        and(
          inArray(processedVideos.channelRuleId, rules.map((r) => r.ruleId)),
          inArray(processedVideos.videoId, videoIds)
        )
      );
    const previousStatus = new Map(previous.map((p) => [`${p.channelRuleId}:${p.videoId}`, p.status]));

    const isPending = (ruleId: string, videoId: string) => {
      const prev = previousStatus.get(`${ruleId}:${videoId}`);
      return !prev || prev === "error";
    };

    // Duraciones solo de los videos que realmente se van a evaluar
    const pendingIds = videoIds.filter((id) => rules.some((r) => isPending(r.ruleId, id)));
    if (pendingIds.length > 0) {
      try {
        videoDurations = await getVideoDurations(accessToken, pendingIds);
        result.quotaUsed += Math.ceil(pendingIds.length / 50);
      } catch (durErr) {
        console.error(`Error obteniendo duraciones del canal ${channel.channelName}:`, durErr);
        return;
      }
    }

    for (const rule of rules) {
      const pendingVideos = channelVideos.filter((v) => isPending(rule.ruleId, v.videoId));
      result.videosSkipped += channelVideos.length - pendingVideos.length;
      if (pendingVideos.length === 0) continue;

      if (!playlistVideoIdsCache.has(rule.targetPlaylistId)) {
        playlistVideoIdsCache.set(rule.targetPlaylistId, getPlaylistVideoIds(accessToken, rule.targetPlaylistId));
        result.quotaUsed += 1;
      }
      const existingInPlaylist = await playlistVideoIdsCache.get(rule.targetPlaylistId)!;

      for (const video of pendingVideos) {
        // 1. Condición incluyente de título
        if (!matchesTitleFilter(video.title, rule.filterType, rule.filterValue)) {
          result.videosFiltered++;
          await record(video, rule, "filtered", "No cumple con la condición incluyente de título");
          continue;
        }

        // 2. Condición excluyente de título
        if (isTitleExcluded(video.title, rule.excludeValue)) {
          result.videosFiltered++;
          await record(video, rule, "filtered", "Excluido por condición de palabras clave en título");
          continue;
        }

        // 3. Shorts
        if (!rule.includeShorts) {
          const duration = videoDurations.get(video.videoId) || 0;
          if (duration <= 120) {
            result.videosFiltered++;
            await record(video, rule, "filtered", "Excluido por ser un Short (duración <= 120s)");
            continue;
          }
        }

        // 4. Ya presente en la lista destino
        if (existingInPlaylist.has(video.videoId)) {
          result.videosFiltered++;
          await record(video, rule, "filtered", "El video ya existía en la lista de reproducción destino");
          continue;
        }

        // 5. Agregar a la lista de YouTube
        try {
          await addVideoToPlaylist(accessToken, rule.targetPlaylistId, video.videoId);
          result.quotaUsed += 50;
          result.videosAdded++;
          existingInPlaylist.add(video.videoId);

          await db
            .update(targetPlaylists)
            .set({ videosAddedCount: sql`${targetPlaylists.videosAddedCount} + 1` })
            .where(eq(targetPlaylists.id, rule.targetPlaylistTableId));

          await record(video, rule, "added", null);
        } catch (addErr: unknown) {
          console.error(`Error agregando video ${video.videoId} a playlist ${rule.targetPlaylistId}:`, addErr);
          result.videosErrored++;
          const errMsg = addErr instanceof Error ? addErr.message : "Error al agregar a YouTube";
          await record(video, rule, "error", errMsg);
        }
      }
    }

    await db
      .update(watchedChannels)
      .set({ lastCheckedAt: new Date() })
      .where(eq(watchedChannels.id, channel.id));
  };

  try {
    for (let i = 0; i < userChannels.length; i += CHUNK_SIZE) {
      const chunk = userChannels.slice(i, i + CHUNK_SIZE);
      // Devuelve el token cacheado si sigue siendo válido
      const accessToken = await getValidYouTubeAccessToken(userId);
      await Promise.all(chunk.map((channel) => processChannel(channel, accessToken)));
    }
  } finally {
    // Se guardan los totales incluso si la ejecución falló a mitad de camino
    await db
      .update(syncLogs)
      .set({
        channelsChecked: result.channelsChecked,
        videosFound: result.videosFound,
        videosAdded: result.videosAdded,
        videosFiltered: result.videosFiltered,
        videosErrored: result.videosErrored,
        quotaUsed: result.quotaUsed,
        finishedAt: new Date(),
      })
      .where(eq(syncLogs.id, syncLogId));
  }

  return result;
}
