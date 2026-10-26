import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { processedVideos, channelRules, watchedChannels, targetPlaylists, syncLogs } from "@/db/schema";
import { eq, desc, and, ilike, gte, lte, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "videos"; // 'videos' or 'syncs'
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    // Límite acotado: el cliente lo calcula según las filas que entran en pantalla
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const offset = (page - 1) * limit;

    if (type === "syncs") {
      const conditions = [eq(syncLogs.userId, userId)];
      if (dateFrom) conditions.push(gte(syncLogs.startedAt, new Date(dateFrom)));
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(syncLogs.startedAt, end));
      }

      const syncs = await db
        .select()
        .from(syncLogs)
        .where(and(...conditions))
        .orderBy(desc(syncLogs.startedAt))
        .limit(limit)
        .offset(offset);

      const [{ count: total }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(syncLogs)
        .where(and(...conditions));

      return NextResponse.json({
        data: syncs,
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit))
      });
    }

    // Default to 'videos' (actividad reciente)
    const conditions = [eq(watchedChannels.userId, userId)];

    if (status !== "all") {
      conditions.push(eq(processedVideos.status, status as any));
    }

    if (search) {
      conditions.push(ilike(processedVideos.videoTitle, `%${search}%`));
    }

    if (dateFrom) {
      conditions.push(gte(processedVideos.processedAt, new Date(dateFrom)));
    }
    
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(processedVideos.processedAt, end));
    }

    const videos = await db
      .select({
        id: processedVideos.id,
        videoId: processedVideos.videoId,
        videoTitle: processedVideos.videoTitle,
        status: processedVideos.status,
        errorMessage: processedVideos.errorMessage,
        processedAt: processedVideos.processedAt,
        channelName: watchedChannels.channelName,
        playlistName: targetPlaylists.playlistName,
      })
      .from(processedVideos)
      .innerJoin(channelRules, eq(processedVideos.channelRuleId, channelRules.id))
      .innerJoin(watchedChannels, eq(channelRules.watchedChannelId, watchedChannels.id))
      .innerJoin(targetPlaylists, eq(channelRules.targetPlaylistId, targetPlaylists.id))
      .where(and(...conditions))
      .orderBy(desc(processedVideos.processedAt))
      .limit(limit)
      .offset(offset);

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(processedVideos)
      .innerJoin(channelRules, eq(processedVideos.channelRuleId, channelRules.id))
      .innerJoin(watchedChannels, eq(channelRules.watchedChannelId, watchedChannels.id))
      .where(and(...conditions));

    return NextResponse.json({
      data: videos,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });

  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
