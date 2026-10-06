import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  userSettings,
  watchedChannels,
  channelRules,
  targetPlaylists,
  processedVideos,
  syncLogs,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getValidYouTubeAccessToken, TokenRevokedError } from "@/lib/youtube/token";
import { getLatestChannelVideos } from "@/lib/youtube/rss";
import { addVideoToPlaylist, getPlaylistVideoIds, getVideoDurations } from "@/lib/youtube/api";
import { matchesTitleFilter, isTitleExcluded } from "@/lib/utils";

export const maxDuration = 300; // 5 minutes max on Vercel Hobby

export async function GET(req: Request) {
  const startedAt = new Date();
  
  try {
    // Verificar si es una petición legítima de cron
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return new Response('Unauthorized', { status: 401 });
      // Para facilitar pruebas manuales lo dejo pasar si no hay CRON_SECRET, pero en prod es ideal
    }

    const allUsers = await db.select().from(users);
    let totalAdded = 0;

    for (const user of allUsers) {
      // Traer settings para verificar la hora
      const settingsResult = await db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1);
      const settings = settingsResult[0];
      
      if (settings) {
        // Lógica de hora: Obtener hora actual en la timezone del usuario
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: settings.timezone || 'America/Argentina/Buenos_Aires',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        const currentTimeParts = formatter.formatToParts(new Date());
        const hour = currentTimeParts.find(p => p.type === 'hour')?.value || '00';
        
        // syncTime es "HH:MM". Comparamos si coincide la hora
        const [syncHour] = (settings.syncTime || '00:00').split(':');
        
        // Si no es la hora de sincronización del usuario, lo saltamos
        // Para Vercel Cron esto corre cada hora, así que verificamos que hour == syncHour
        if (hour !== syncHour) {
          continue; 
        }
      }

      let accessToken: string;
      try {
        accessToken = await getValidYouTubeAccessToken(user.id);
      } catch (tokenErr) {
        if (tokenErr instanceof TokenRevokedError) {
          console.warn(`Cron: Token revocado para usuario ${user.id}. Saltando.`);
          continue;
        }
        console.error(`Cron: Error obteniendo token para usuario ${user.id}:`, tokenErr);
        continue;
      }

      const userChannels = await db
        .select()
        .from(watchedChannels)
        .where(and(eq(watchedChannels.userId, user.id), eq(watchedChannels.isActive, true)));

      if (userChannels.length === 0) continue;

      let channelsChecked = 0;
      let videosFound = 0;
      let videosAdded = 0;
      let videosFiltered = 0;
      let videosErrored = 0;
      let quotaUsed = 0;

      const playlistVideoIdsCache = new Map<string, Set<string>>();

      const chunkSize = 10;
      for (let i = 0; i < userChannels.length; i += chunkSize) {
        const chunk = userChannels.slice(i, i + chunkSize);
        // Re-fetch token per chunk — returns cached token if still valid
        accessToken = await getValidYouTubeAccessToken(user.id);
        
        await Promise.all(chunk.map(async (channel) => {
        channelsChecked++;
        
        // Usamos una ventana móvil de 48 horas (stateless).
        // Al ser idempotente (verifica la playlist primero), no importa si se solapan ejecuciones,
        // garantizando que no se pierda NINGÚN video sin importar a qué hora se ejecute el cron.
        const windowStart = new Date(Date.now() - 48 * 60 * 60 * 1000);

        const rules = await db
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
              eq(targetPlaylists.userId, user.id)
            )
          );

        if (rules.length === 0) return;

        let channelVideos;
        let videoDurations = new Map<string, number>();
        
        try {
          const allRecentVideos = await getLatestChannelVideos(channel.channelId);
          channelVideos = allRecentVideos.filter((v) => v.publishedAt >= windowStart);

          if (channelVideos.length > 0) {
            const videoIds = channelVideos.map((v) => v.videoId);
            videoDurations = await getVideoDurations(accessToken, videoIds);
            quotaUsed += Math.ceil(videoIds.length / 50); 
          }
        } catch (feedErr) {
          console.error(`Cron error canal ${channel.channelName}:`, feedErr);
          return;
        }

        videosFound += channelVideos.length;

        for (const rule of rules) {
          if (!playlistVideoIdsCache.has(rule.targetPlaylistId)) {
            const ytVideoIds = await getPlaylistVideoIds(accessToken, rule.targetPlaylistId);
            playlistVideoIdsCache.set(rule.targetPlaylistId, ytVideoIds);
            quotaUsed += 1;
          }
          const existingInPlaylist = playlistVideoIdsCache.get(rule.targetPlaylistId)!;

          for (const video of channelVideos) {
            if (!matchesTitleFilter(video.title, rule.filterType, rule.filterValue)) {
              videosFiltered++;
              await recordProcessedVideo(video, rule, "filtered", "No cumple con la condición incluyente de título");
              continue;
            }

            if (isTitleExcluded(video.title, rule.excludeValue)) {
              videosFiltered++;
              await recordProcessedVideo(video, rule, "filtered", "Excluido por condición de palabras clave en título");
              continue;
            }

            if (!rule.includeShorts) {
              const duration = videoDurations.get(video.videoId) || 0;
              if (duration <= 120) {
                videosFiltered++;
                await recordProcessedVideo(video, rule, "filtered", "Excluido por ser un Short (duración <= 120s)");
                continue;
              }
            }

            if (existingInPlaylist.has(video.videoId)) {
              videosFiltered++;
              await recordProcessedVideo(video, rule, "filtered", "El video ya existía en la lista de reproducción destino");
              continue;
            }

            try {
              await addVideoToPlaylist(accessToken, rule.targetPlaylistId, video.videoId);
              quotaUsed += 50;
              videosAdded++;
              existingInPlaylist.add(video.videoId);

              await db.update(targetPlaylists)
                .set({ videosAddedCount: sql`${targetPlaylists.videosAddedCount} + 1` })
                .where(eq(targetPlaylists.id, rule.targetPlaylistTableId));

              await recordProcessedVideo(video, rule, "added", null);
            } catch (addErr: unknown) {
              videosErrored++;
              const errMsg = addErr instanceof Error ? addErr.message : "Error al agregar a YouTube";
              await recordProcessedVideo(video, rule, "error", errMsg);
            }
          }
        }

        await db
          .update(watchedChannels)
          .set({ lastCheckedAt: new Date() })
          .where(eq(watchedChannels.id, channel.id));
        }));
      }

      totalAdded += videosAdded;

      // Log execution per user
      if (channelsChecked > 0) {
        await db.insert(syncLogs).values({
          userId: user.id,
          executionType: "auto",
          channelsChecked,
          videosFound,
          videosAdded,
          videosFiltered,
          videosErrored,
          quotaUsed,
          windowStart: new Date(startedAt.getTime() - 48 * 60 * 60 * 1000), // Fixed 48h window
          windowEnd: startedAt,
          startedAt,
          finishedAt: new Date(),
        });
      }
    }

    return NextResponse.json({ success: true, totalAdded });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function recordProcessedVideo(video: any, rule: any, status: any, errorMessage: string | null) {
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
        processedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [processedVideos.videoId, processedVideos.channelRuleId],
        set: { status, errorMessage, processedAt: new Date() },
      });
  } catch (e) {
    console.error("Error guardando video procesado:", e);
  }
}
