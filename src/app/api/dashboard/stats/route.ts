import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  watchedChannels,
  channelRules,
  processedVideos,
  syncLogs,
  userSettings,
  targetPlaylists,
} from "@/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 1. Canales monitoreados
    const [channelsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(watchedChannels)
      .where(eq(watchedChannels.userId, userId));
    const channelsCount = channelsResult?.count || 0;

    // 2. Reglas activas
    const [rulesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(channelRules)
      .innerJoin(watchedChannels, eq(channelRules.watchedChannelId, watchedChannels.id))
      .where(and(eq(watchedChannels.userId, userId), eq(channelRules.isActive, true)));
    const activeRulesCount = rulesResult?.count || 0;

    // 2.5 Listas de reproducción
    const [playlistsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(targetPlaylists)
      .where(eq(targetPlaylists.userId, userId));
    const playlistsCount = playlistsResult?.count || 0;

    // 3. Videos añadidos hoy (desde 00:00hs en la timezone del usuario)
    const [settingsResult] = await db
      .select({ timezone: userSettings.timezone })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    
    const tz = settingsResult?.timezone || 'America/Argentina/Buenos_Aires';
    
    // Obtener la fecha de "hoy a las 00:00" en la zona horaria del usuario, convertida a UTC para comparar
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')!.value;
    const m = parts.find(p => p.type === 'month')!.value;
    const d = parts.find(p => p.type === 'day')!.value;
    
    // Convertir el inicio del día del usuario a un Date object absoluto
    const todayStartString = `${y}-${m}-${d}T00:00:00`;
    // We can't directly parse this as local, so we construct it and let JS handle it, or we can just approximate 24h:
    // But a better way is to query syncLogs for videosAdded where finishedAt is today.
    // Actually, processedVideos is fine.
    // Let's use `now` minus hours elapsed today in that timezone.
    const hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
    const hParts = hourFormatter.formatToParts(new Date());
    const currentHour = parseInt(hParts.find(p => p.type === 'hour')!.value, 10);
    const currentMin = parseInt(hParts.find(p => p.type === 'minute')!.value, 10);
    
    const todayStart = new Date(Date.now() - (currentHour * 60 * 60 * 1000) - (currentMin * 60 * 1000));

    // Sumar todos los videos añadidos en syncLogs que se ejecutaron hoy
    const [syncsResult] = await db
      .select({ totalAdded: sql<number>`sum(${syncLogs.videosAdded})::int` })
      .from(syncLogs)
      .where(
        and(
          eq(syncLogs.userId, userId),
          gte(syncLogs.startedAt, todayStart)
        )
      );
    const videosAddedToday = syncsResult?.totalAdded || 0;

    // 4. Última sincronización
    const lastSyncLog = await db.query.syncLogs.findFirst({
      where: eq(syncLogs.userId, userId),
      orderBy: desc(syncLogs.finishedAt),
    });

    // 5. Actividad reciente: últimos videos procesados
    const recentVideos = await db
      .select({
        id: processedVideos.id,
        videoId: processedVideos.videoId,
        videoTitle: processedVideos.videoTitle,
        videoUrl: processedVideos.videoUrl,
        status: processedVideos.status,
        errorMessage: processedVideos.errorMessage,
        processedAt: processedVideos.processedAt,
        playlistName: targetPlaylists.playlistName,
      })
      .from(processedVideos)
      .innerJoin(targetPlaylists, eq(processedVideos.targetPlaylistId, targetPlaylists.id))
      .where(eq(targetPlaylists.userId, userId))
      .orderBy(desc(processedVideos.processedAt))
      .limit(6);

    // 6. Últimos registros de sincronización
    const recentLogs = await db
      .select()
      .from(syncLogs)
      .where(eq(syncLogs.userId, userId))
      .orderBy(desc(syncLogs.finishedAt))
      .limit(4);

    return NextResponse.json({
      channelsCount,
      activeRulesCount,
      playlistsCount,
      videosAddedToday,
      lastSync: lastSyncLog?.finishedAt || null,
      recentVideos,
      recentLogs,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
