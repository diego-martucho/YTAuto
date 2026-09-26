import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  watchedChannels,
  channelRules,
  targetPlaylists,
  processedVideos,
  syncLogs,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getValidYouTubeAccessToken } from "@/lib/youtube/token";
import { getLatestChannelVideos } from "@/lib/youtube/rss";
import { addVideoToPlaylist, getPlaylistVideoIds } from "@/lib/youtube/api";
import { matchesTitleFilter, isTitleExcluded } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const startedAt = new Date();
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const accessToken = await getValidYouTubeAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: "No se pudo obtener el token de acceso a YouTube. Inicia sesión nuevamente." },
        { status: 403 }
      );
    }

    // Calculamos el inicio del día actual (00:00:00) según el huso horario local
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const windowEnd = now;

    // Obtener canales monitorizados activos del usuario
    const userChannels = await db
      .select()
      .from(watchedChannels)
      .where(and(eq(watchedChannels.userId, userId), eq(watchedChannels.isActive, true)));

    if (userChannels.length === 0) {
      return NextResponse.json({
        success: true,
        channelsChecked: 0,
        videosFound: 0,
        videosAdded: 0,
        videosFiltered: 0,
        videosErrored: 0,
        message: "No tienes canales activos para sincronizar.",
      });
    }

    let channelsChecked = 0;
    let videosFound = 0;
    let videosAdded = 0;
    let videosFiltered = 0;
    let videosErrored = 0;
    let quotaUsed = 0;

    // Cache de IDs de videos ya presentes en playlists de YouTube
    const playlistVideoIdsCache = new Map<string, Set<string>>();

    for (const channel of userChannels) {
      channelsChecked++;

      // Obtener reglas activas de este canal
      const rules = await db
        .select({
          ruleId: channelRules.id,
          filterType: channelRules.filterType,
          filterValue: channelRules.filterValue,
          excludeValue: channelRules.excludeValue,
          targetPlaylistTableId: targetPlaylists.id,
          targetPlaylistId: targetPlaylists.playlistId,
          targetPlaylistName: targetPlaylists.playlistName,
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

      if (rules.length === 0) continue;

      let channelVideos;
      try {
        const allRecentVideos = await getLatestChannelVideos(channel.channelId);
        // Filtrar videos publicados hoy desde las 00:00hs
        channelVideos = allRecentVideos.filter((v) => v.publishedAt >= windowStart);
      } catch (feedErr) {
        console.error(`Error al obtener RSS de canal ${channel.channelName}:`, feedErr);
        continue;
      }

      videosFound += channelVideos.length;

      for (const rule of rules) {
        // Cargar set de videos existentes en la playlist destino de YouTube
        if (!playlistVideoIdsCache.has(rule.targetPlaylistId)) {
          const ytVideoIds = await getPlaylistVideoIds(accessToken, rule.targetPlaylistId);
          playlistVideoIdsCache.set(rule.targetPlaylistId, ytVideoIds);
          quotaUsed += 1;
        }
        const existingInPlaylist = playlistVideoIdsCache.get(rule.targetPlaylistId)!;

        for (const video of channelVideos) {
          // 1. Condición incluyente de título
          const passesInclusion = matchesTitleFilter(
            video.title,
            rule.filterType,
            rule.filterValue
          );
          if (!passesInclusion) {
            videosFiltered++;
            await recordProcessedVideo({
              videoId: video.videoId,
              channelRuleId: rule.ruleId,
              targetPlaylistId: rule.targetPlaylistTableId,
              videoTitle: video.title,
              videoUrl: video.url,
              publishedAt: video.publishedAt,
              status: "filtered",
              errorMessage: "No cumple con la condición incluyente de título",
            });
            continue;
          }

          // 2. Condición excluyente de título (Requirement 1)
          const isExcluded = isTitleExcluded(video.title, rule.excludeValue);
          if (isExcluded) {
            videosFiltered++;
            await recordProcessedVideo({
              videoId: video.videoId,
              channelRuleId: rule.ruleId,
              targetPlaylistId: rule.targetPlaylistTableId,
              videoTitle: video.title,
              videoUrl: video.url,
              publishedAt: video.publishedAt,
              status: "filtered",
              errorMessage: "Excluido por condición de palabras clave en título",
            });
            continue;
          }

          // 3. Regla para verificar que el video no exista ya en la lista (Requirement 8)
          if (existingInPlaylist.has(video.videoId)) {
            videosFiltered++;
            await recordProcessedVideo({
              videoId: video.videoId,
              channelRuleId: rule.ruleId,
              targetPlaylistId: rule.targetPlaylistTableId,
              videoTitle: video.title,
              videoUrl: video.url,
              publishedAt: video.publishedAt,
              status: "filtered",
              errorMessage: "El video ya existía en la lista de reproducción destino",
            });
            continue;
          }

          // 4. Agregar a la lista de reproducción de YouTube
          try {
            await addVideoToPlaylist(accessToken, rule.targetPlaylistId, video.videoId);
            quotaUsed += 50;
            videosAdded++;
            existingInPlaylist.add(video.videoId);

            // Incrementar contador de la playlist en DB
            await db
              .update(targetPlaylists)
              .set({
                videosAddedCount: sql`${targetPlaylists.videosAddedCount} + 1`,
              })
              .where(eq(targetPlaylists.id, rule.targetPlaylistTableId));

            await recordProcessedVideo({
              videoId: video.videoId,
              channelRuleId: rule.ruleId,
              targetPlaylistId: rule.targetPlaylistTableId,
              videoTitle: video.title,
              videoUrl: video.url,
              publishedAt: video.publishedAt,
              status: "added",
              errorMessage: null,
            });
          } catch (addErr: unknown) {
            console.error(`Error agregando video ${video.videoId} a playlist ${rule.targetPlaylistId}:`, addErr);
            videosErrored++;
            const errMsg = addErr instanceof Error ? addErr.message : "Error al agregar a YouTube";
            await recordProcessedVideo({
              videoId: video.videoId,
              channelRuleId: rule.ruleId,
              targetPlaylistId: rule.targetPlaylistTableId,
              videoTitle: video.title,
              videoUrl: video.url,
              publishedAt: video.publishedAt,
              status: "error",
              errorMessage: errMsg,
            });
          }
        }
      }

      // Actualizar timestamp de revisión del canal
      await db
        .update(watchedChannels)
        .set({ lastCheckedAt: new Date() })
        .where(eq(watchedChannels.id, channel.id));
    }

    const finishedAt = new Date();

    // Guardar registro de la sincronización en syncLogs
    await db.insert(syncLogs).values({
      userId,
      channelsChecked,
      videosFound,
      videosAdded,
      videosFiltered,
      videosErrored,
      quotaUsed,
      windowStart,
      windowEnd,
      startedAt,
      finishedAt,
    });

    return NextResponse.json({
      success: true,
      channelsChecked,
      videosFound,
      videosAdded,
      videosFiltered,
      videosErrored,
      quotaUsed,
      message: `Sincronización completada: ${videosAdded} ${videosAdded === 1 ? "video agregado" : "videos agregados"}.`,
    });
  } catch (error: unknown) {
    console.error("Error en sincronización manual:", error);
    const msg = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function recordProcessedVideo(data: {
  videoId: string;
  channelRuleId: string;
  targetPlaylistId: string;
  videoTitle: string;
  videoUrl: string;
  publishedAt: Date;
  status: "added" | "filtered" | "error";
  errorMessage: string | null;
}) {
  try {
    // Si ya existe registro de este video para esta regla, actualizar; de lo contrario, insertar
    await db
      .insert(processedVideos)
      .values({
        videoId: data.videoId,
        channelRuleId: data.channelRuleId,
        targetPlaylistId: data.targetPlaylistId,
        videoTitle: data.videoTitle,
        videoUrl: data.videoUrl,
        publishedAt: data.publishedAt,
        status: data.status,
        errorMessage: data.errorMessage,
        processedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [processedVideos.videoId, processedVideos.channelRuleId],
        set: {
          status: data.status,
          errorMessage: data.errorMessage,
          processedAt: new Date(),
        },
      });
  } catch (e) {
    console.error("Error guardando video procesado:", e);
  }
}
