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

    // 1. Canales monitoreados (totales y activos)
    const [channelsStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${watchedChannels.isActive} = true)::int`,
      })
      .from(watchedChannels)
      .where(eq(watchedChannels.userId, userId));

    const channelsCount = channelsStats?.total || 0;
    const activeChannelsCount = channelsStats?.active || 0;
    const inactiveChannelsCount = Math.max(0, channelsCount - activeChannelsCount);

    // 2. Reglas de organización (totales, activas, con shorts)
    const [rulesStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${channelRules.isActive} = true)::int`,
        withShorts: sql<number>`count(*) filter (where ${channelRules.includeShorts} = true)::int`,
      })
      .from(channelRules)
      .innerJoin(watchedChannels, eq(channelRules.watchedChannelId, watchedChannels.id))
      .where(eq(watchedChannels.userId, userId));

    const totalRulesCount = rulesStats?.total || 0;
    const activeRulesCount = rulesStats?.active || 0;
    const shortsEnabledRulesCount = rulesStats?.withShorts || 0;

    // 3. Listas de reproducción (totales y con reglas asignadas)
    const [playlistsStats] = await db
      .select({
        total: sql<number>`count(distinct ${targetPlaylists.id})::int`,
        withRules: sql<number>`count(distinct case when ${channelRules.id} is not null then ${targetPlaylists.id} end)::int`,
      })
      .from(targetPlaylists)
      .leftJoin(channelRules, eq(channelRules.targetPlaylistId, targetPlaylists.id))
      .where(eq(targetPlaylists.userId, userId));

    const playlistsCount = playlistsStats?.total || 0;
    const playlistsWithRulesCount = playlistsStats?.withRules || 0;
    const playlistsWithoutRulesCount = Math.max(0, playlistsCount - playlistsWithRulesCount);

    // 4. Zona horaria e inicio del día actual del usuario
    const [settingsResult] = await db
      .select({ timezone: userSettings.timezone })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    const tz = settingsResult?.timezone || "America/Argentina/Buenos_Aires";
    const now = new Date();
    const hourFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const hParts = hourFormatter.formatToParts(now);
    const currentHour = parseInt(hParts.find((p) => p.type === "hour")?.value || "0", 10);
    const currentMin = parseInt(hParts.find((p) => p.type === "minute")?.value || "0", 10);
    const currentSec = parseInt(hParts.find((p) => p.type === "second")?.value || "0", 10);

    const todayStart = new Date(
      now.getTime() - (currentHour * 3600 + currentMin * 60 + currentSec) * 1000
    );

    // 5. Estadísticas de videos procesados (históricos y de hoy)
    const [videoStats] = await db
      .select({
        totalProcessed: sql<number>`count(*)::int`,
        totalAdded: sql<number>`count(*) filter (where ${processedVideos.status} = 'added')::int`,
        totalFiltered: sql<number>`count(*) filter (where ${processedVideos.status} = 'filtered')::int`,
        totalErrored: sql<number>`count(*) filter (where ${processedVideos.status} = 'error')::int`,
        processedToday: sql<number>`count(*) filter (where ${processedVideos.processedAt} >= ${todayStart})::int`,
        addedToday: sql<number>`count(*) filter (where ${processedVideos.status} = 'added' and ${processedVideos.processedAt} >= ${todayStart})::int`,
        filteredToday: sql<number>`count(*) filter (where ${processedVideos.status} = 'filtered' and ${processedVideos.processedAt} >= ${todayStart})::int`,
        filteredByShorts: sql<number>`count(*) filter (where ${processedVideos.status} = 'filtered' and ${processedVideos.errorMessage} ilike '%Short%')::int`,
        filteredByTitle: sql<number>`count(*) filter (where ${processedVideos.status} = 'filtered' and ${processedVideos.errorMessage} ilike '%título%')::int`,
        filteredByDuplicate: sql<number>`count(*) filter (where ${processedVideos.status} = 'filtered' and ${processedVideos.errorMessage} ilike '%ya existía%')::int`,
        firstProcessedAt: sql<string | null>`min(${processedVideos.processedAt})`,
      })
      .from(processedVideos)
      .innerJoin(channelRules, eq(processedVideos.channelRuleId, channelRules.id))
      .innerJoin(watchedChannels, eq(channelRules.watchedChannelId, watchedChannels.id))
      .where(eq(watchedChannels.userId, userId));

    // 6. Estadísticas de ejecuciones (syncLogs) y cuota
    const [syncStats] = await db
      .select({
        totalSyncs: sql<number>`count(*)::int`,
        autoSyncs: sql<number>`count(*) filter (where ${syncLogs.executionType} = 'auto')::int`,
        manualSyncs: sql<number>`count(*) filter (where ${syncLogs.executionType} = 'manual')::int`,
        syncAddedToday: sql<number>`coalesce(sum(${syncLogs.videosAdded}) filter (where ${syncLogs.startedAt} >= ${todayStart}), 0)::int`,
        quotaUsedToday: sql<number>`coalesce(sum(${syncLogs.quotaUsed}) filter (where ${syncLogs.startedAt} >= ${todayStart}), 0)::int`,
        totalQuotaUsed: sql<number>`coalesce(sum(${syncLogs.quotaUsed}), 0)::int`,
        firstSyncAt: sql<string | null>`min(${syncLogs.startedAt})`,
      })
      .from(syncLogs)
      .where(eq(syncLogs.userId, userId));

    const totalVideosProcessed = videoStats?.totalProcessed || 0;
    const totalVideosAdded = videoStats?.totalAdded || 0;
    const totalVideosFiltered = videoStats?.totalFiltered || 0;
    const totalVideosErrored = videoStats?.totalErrored || 0;

    const videosAddedToday = Math.max(
      videoStats?.addedToday || 0,
      syncStats?.syncAddedToday || 0
    );
    const videosProcessedToday = videoStats?.processedToday || 0;
    const videosFilteredToday = videoStats?.filteredToday || 0;

    // 7. Cálculo de días activos y promedios diarios
    const candidateDates: number[] = [];
    if (videoStats?.firstProcessedAt) {
      candidateDates.push(new Date(videoStats.firstProcessedAt).getTime());
    }
    if (syncStats?.firstSyncAt) {
      candidateDates.push(new Date(syncStats.firstSyncAt).getTime());
    }

    const earliestMs = candidateDates.length > 0 ? Math.min(...candidateDates) : now.getTime();
    const activeDays = Math.max(
      1,
      Math.ceil((now.getTime() - earliestMs) / (1000 * 60 * 60 * 24))
    );

    const avgDailyAdded = Number((totalVideosAdded / activeDays).toFixed(1));
    const avgDailyProcessed = Number((totalVideosProcessed / activeDays).toFixed(1));
    const acceptanceRate =
      totalVideosProcessed > 0
        ? Math.round((totalVideosAdded / totalVideosProcessed) * 100)
        : 0;

    // 8. Última sincronización
    const lastSyncLog = await db.query.syncLogs.findFirst({
      where: eq(syncLogs.userId, userId),
      orderBy: desc(syncLogs.finishedAt),
    });

    // 9. Top canales con más videos agregados
    const topChannels = await db
      .select({
        id: watchedChannels.id,
        channelName: watchedChannels.channelName,
        channelThumbnail: watchedChannels.channelThumbnail,
        isActive: watchedChannels.isActive,
        addedCount: sql<number>`count(${processedVideos.id}) filter (where ${processedVideos.status} = 'added')::int`,
        processedCount: sql<number>`count(${processedVideos.id})::int`,
      })
      .from(watchedChannels)
      .leftJoin(channelRules, eq(channelRules.watchedChannelId, watchedChannels.id))
      .leftJoin(processedVideos, eq(processedVideos.channelRuleId, channelRules.id))
      .where(eq(watchedChannels.userId, userId))
      .groupBy(watchedChannels.id)
      .orderBy(
        desc(sql`count(${processedVideos.id}) filter (where ${processedVideos.status} = 'added')`),
        desc(sql`count(${processedVideos.id})`)
      )
      .limit(4);

    // 10. Top listas de reproducción más activas
    const topPlaylists = await db
      .select({
        id: targetPlaylists.id,
        playlistId: targetPlaylists.playlistId,
        playlistName: targetPlaylists.playlistName,
        videosAddedCount: targetPlaylists.videosAddedCount,
        rulesCount: sql<number>`count(${channelRules.id})::int`,
      })
      .from(targetPlaylists)
      .leftJoin(channelRules, eq(channelRules.targetPlaylistId, targetPlaylists.id))
      .where(eq(targetPlaylists.userId, userId))
      .groupBy(targetPlaylists.id)
      .orderBy(desc(targetPlaylists.videosAddedCount), desc(sql`count(${channelRules.id})`))
      .limit(4);

    return NextResponse.json({
      channelsCount,
      activeChannelsCount,
      inactiveChannelsCount,
      playlistsCount,
      playlistsWithRulesCount,
      playlistsWithoutRulesCount,
      totalRulesCount,
      activeRulesCount,
      shortsEnabledRulesCount,
      videosAddedToday,
      videosProcessedToday,
      videosFilteredToday,
      totalVideosProcessed,
      totalVideosAdded,
      totalVideosFiltered,
      totalVideosErrored,
      filteredByShorts: videoStats?.filteredByShorts || 0,
      filteredByTitle: videoStats?.filteredByTitle || 0,
      filteredByDuplicate: videoStats?.filteredByDuplicate || 0,
      activeDays,
      avgDailyAdded,
      avgDailyProcessed,
      acceptanceRate,
      totalSyncsCount: syncStats?.totalSyncs || 0,
      autoSyncsCount: syncStats?.autoSyncs || 0,
      manualSyncsCount: syncStats?.manualSyncs || 0,
      quotaUsedToday: syncStats?.quotaUsedToday || 0,
      totalQuotaUsed: syncStats?.totalQuotaUsed || 0,
      lastSync: lastSyncLog?.finishedAt || null,
      lastSyncType: lastSyncLog?.executionType || null,
      lastSyncAdded: lastSyncLog?.videosAdded ?? 0,
      topChannels,
      topPlaylists,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

