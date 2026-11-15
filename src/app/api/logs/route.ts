import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { processedVideos, channelRules, watchedChannels, targetPlaylists, syncLogs } from "@/db/schema";
import { eq, desc, and, or, gte, lte, isNull, sql } from "drizzle-orm";

/** Máximo de videos devueltos para el detalle de una ejecución. */
const MAX_SYNC_VIDEOS = 1000;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "syncs"; // 'syncs' | 'syncVideos'

    // ── Detalle: videos procesados en una ejecución ──
    if (type === "syncVideos") {
      const syncId = searchParams.get("syncId");
      if (!syncId) {
        return NextResponse.json({ error: "syncId es requerido" }, { status: 400 });
      }

      const sync = await db.query.syncLogs.findFirst({
        where: and(eq(syncLogs.id, syncId), eq(syncLogs.userId, userId)),
      });
      if (!sync) {
        return NextResponse.json({ error: "Ejecución no encontrada" }, { status: 404 });
      }

      // Las ejecuciones nuevas vinculan cada video con su id. Para las anteriores a ese cambio
      // se usa el rango horario de la ejecución como aproximación.
      const windowEnd = sync.finishedAt ?? new Date(sync.startedAt.getTime() + 10 * 60 * 1000);
      const linkCondition = or(
        eq(processedVideos.syncLogId, sync.id),
        and(
          isNull(processedVideos.syncLogId),
          gte(processedVideos.processedAt, sync.startedAt),
          lte(processedVideos.processedAt, windowEnd)
        )
      );

      const videos = await db
        .select({
          id: processedVideos.id,
          videoId: processedVideos.videoId,
          videoTitle: processedVideos.videoTitle,
          status: processedVideos.status,
          errorMessage: processedVideos.errorMessage,
          publishedAt: processedVideos.publishedAt,
          processedAt: processedVideos.processedAt,
          linked: sql<boolean>`${processedVideos.syncLogId} is not null`,
          channelName: watchedChannels.channelName,
          channelThumbnail: watchedChannels.channelThumbnail,
          playlistName: targetPlaylists.playlistName,
          playlistId: targetPlaylists.playlistId,
        })
        .from(processedVideos)
        .innerJoin(channelRules, eq(processedVideos.channelRuleId, channelRules.id))
        .innerJoin(watchedChannels, eq(channelRules.watchedChannelId, watchedChannels.id))
        .innerJoin(targetPlaylists, eq(processedVideos.targetPlaylistId, targetPlaylists.id))
        .where(and(eq(watchedChannels.userId, userId), linkCondition))
        .orderBy(
          sql`case ${processedVideos.status} when 'added' then 0 when 'error' then 1 else 2 end`,
          desc(processedVideos.publishedAt)
        )
        .limit(MAX_SYNC_VIDEOS);

      return NextResponse.json({
        sync,
        videos,
        approximate: videos.some((v) => !v.linked),
        truncated: videos.length >= MAX_SYNC_VIDEOS,
      });
    }

    // ── Listado paginado de ejecuciones ──
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    // Límite acotado: el cliente lo calcula según las filas que entran en pantalla
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
    const typeFilter = searchParams.get("executionType") || "all"; // 'all' | 'auto' | 'manual'
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const offset = (page - 1) * limit;

    const conditions = [eq(syncLogs.userId, userId)];
    if (typeFilter === "auto" || typeFilter === "manual") {
      conditions.push(eq(syncLogs.executionType, typeFilter));
    }
    if (dateFrom) conditions.push(gte(syncLogs.startedAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(syncLogs.startedAt, end));
    }

    const [syncs, [{ count: total }]] = await Promise.all([
      db
        .select()
        .from(syncLogs)
        .where(and(...conditions))
        .orderBy(desc(syncLogs.startedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(syncLogs)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({
      data: syncs,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
