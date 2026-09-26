import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  watchedChannels,
  channelRules,
  processedVideos,
  syncLogs,
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

    // 3. Videos añadidos hoy (desde 00:00hs)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const [videosResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(processedVideos)
      .innerJoin(targetPlaylists, eq(processedVideos.targetPlaylistId, targetPlaylists.id))
      .where(
        and(
          eq(targetPlaylists.userId, userId),
          eq(processedVideos.status, "added"),
          gte(processedVideos.processedAt, todayStart)
        )
      );
    const videosAddedToday = videosResult?.count || 0;

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
