import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { targetPlaylists, channelRules, watchedChannels, processedVideos } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getValidYouTubeAccessToken } from "@/lib/youtube/token";
import { getUserPlaylists } from "@/lib/youtube/api";

async function getPlaylistsWithRuleCounts(userId: string) {
  return db
    .select({
      id: targetPlaylists.id,
      userId: targetPlaylists.userId,
      playlistId: targetPlaylists.playlistId,
      playlistName: targetPlaylists.playlistName,
      videosAddedCount: targetPlaylists.videosAddedCount,
      description: targetPlaylists.description,
      thumbnailUrl: targetPlaylists.thumbnailUrl,
      itemCount: targetPlaylists.itemCount,
      privacyStatus: targetPlaylists.privacyStatus,
      lastSyncedAt: targetPlaylists.lastSyncedAt,
      createdAt: targetPlaylists.createdAt,
      rulesCount: sql<number>`count(${channelRules.id})::int`,
      activeRulesCount: sql<number>`count(${channelRules.id}) filter (where ${channelRules.isActive} = true)::int`,
    })
    .from(targetPlaylists)
    .leftJoin(channelRules, eq(channelRules.targetPlaylistId, targetPlaylists.id))
    .where(eq(targetPlaylists.userId, userId))
    .groupBy(targetPlaylists.id);
}

/**
 * Listas con métricas de actividad (último video agregado, agregados en 7 días)
 * y los canales que alimentan cada lista a través de sus reglas.
 */
async function getEnrichedPlaylists(userId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [base, activity, sources] = await Promise.all([
    getPlaylistsWithRuleCounts(userId),
    db
      .select({
        targetPlaylistId: processedVideos.targetPlaylistId,
        lastAddedAt: sql<string | null>`max(${processedVideos.processedAt}) filter (where ${processedVideos.status} = 'added')`,
        addedLast7Days: sql<number>`count(*) filter (where ${processedVideos.status} = 'added' and ${processedVideos.processedAt} >= ${sevenDaysAgo})::int`,
      })
      .from(processedVideos)
      .innerJoin(targetPlaylists, eq(processedVideos.targetPlaylistId, targetPlaylists.id))
      .where(eq(targetPlaylists.userId, userId))
      .groupBy(processedVideos.targetPlaylistId),
    db
      .select({
        targetPlaylistId: channelRules.targetPlaylistId,
        channelId: watchedChannels.id,
        channelName: watchedChannels.channelName,
        channelThumbnail: watchedChannels.channelThumbnail,
        ruleActive: channelRules.isActive,
      })
      .from(channelRules)
      .innerJoin(watchedChannels, eq(channelRules.watchedChannelId, watchedChannels.id))
      .where(eq(watchedChannels.userId, userId)),
  ]);

  const activityById = new Map(activity.map((a) => [a.targetPlaylistId, a]));
  const sourcesById = new Map<
    string,
    Array<{ id: string; name: string; thumbnail: string | null; active: boolean }>
  >();
  for (const s of sources) {
    const list = sourcesById.get(s.targetPlaylistId) ?? [];
    // Un canal puede tener varias reglas hacia la misma lista: se muestra una vez
    const existing = list.find((c) => c.id === s.channelId);
    if (existing) {
      existing.active = existing.active || s.ruleActive;
    } else {
      list.push({ id: s.channelId, name: s.channelName, thumbnail: s.channelThumbnail, active: s.ruleActive });
    }
    sourcesById.set(s.targetPlaylistId, list);
  }

  return base.map((p) => ({
    ...p,
    lastAddedAt: activityById.get(p.id)?.lastAddedAt ?? null,
    addedLast7Days: activityById.get(p.id)?.addedLast7Days ?? 0,
    sourceChannels: (sourcesById.get(p.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" })
    ),
  }));
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const playlists = await getEnrichedPlaylists(session.user.id);
    return NextResponse.json(playlists);
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { action } = body;
    // IDs de YouTube de las listas que el usuario quiere seguir en YTAuto.
    // Si no se envía, solo se actualizan las listas que ya se siguen (nunca se agregan todas).
    const selectedPlaylistIds: string[] | null = Array.isArray(body.selectedPlaylistIds)
      ? body.selectedPlaylistIds.filter((id: unknown): id is string => typeof id === "string")
      : null;

    if (action === "sync") {
      const accessToken = await getValidYouTubeAccessToken(userId);
      if (!accessToken) {
        return NextResponse.json({ error: "No valid YouTube access token" }, { status: 403 });
      }

      const apiPlaylists = await getUserPlaylists(accessToken);
      const existingPlaylists = await getPlaylistsWithRuleCounts(userId);

      const existingByYtId = new Map(existingPlaylists.map((p) => [p.playlistId, p]));
      const apiIds = new Set(apiPlaylists.map((p) => p.id));
      const selected = new Set(selectedPlaylistIds ?? existingPlaylists.map((p) => p.playlistId));
      const now = new Date();

      // Insert newly selected ones
      const newPlaylistsToInsert = apiPlaylists
        .filter((p) => selected.has(p.id) && !existingByYtId.has(p.id))
        .map((p) => ({
          userId,
          playlistId: p.id,
          playlistName: p.title,
          description: p.description || null,
          thumbnailUrl: p.thumbnailUrl || null,
          itemCount: p.itemCount,
          privacyStatus: p.privacyStatus,
          lastSyncedAt: now,
        }));

      // Update name + metadata of the ones that stay (todo en una sola ida a la base)
      const updates = apiPlaylists
        .filter((p) => selected.has(p.id) && existingByYtId.has(p.id))
        .map((p) =>
          db
            .update(targetPlaylists)
            .set({
              playlistName: p.title,
              description: p.description || null,
              thumbnailUrl: p.thumbnailUrl || null,
              itemCount: p.itemCount,
              privacyStatus: p.privacyStatus,
              lastSyncedAt: now,
            })
            .where(eq(targetPlaylists.id, existingByYtId.get(p.id)!.id))
        );

      // Quitar las que ya no existen en YouTube y las que el usuario desmarcó.
      // Sus reglas se eliminan en cascada, por eso se informan al usuario.
      const missingPlaylists = existingPlaylists.filter(
        (p) => !apiIds.has(p.playlistId) || !selected.has(p.playlistId)
      );
      const renamedCount = apiPlaylists.filter((p) => {
        const existing = existingByYtId.get(p.id);
        return selected.has(p.id) && existing && existing.playlistName !== p.title;
      }).length;

      const statements = [
        ...(newPlaylistsToInsert.length > 0 ? [db.insert(targetPlaylists).values(newPlaylistsToInsert)] : []),
        ...updates,
        ...(missingPlaylists.length > 0
          ? [
              db.delete(targetPlaylists).where(
                and(
                  eq(targetPlaylists.userId, userId),
                  inArray(targetPlaylists.id, missingPlaylists.map((p) => p.id))
                )
              ),
            ]
          : []),
      ];

      if (statements.length > 0) {
        await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);
      }

      const allPlaylists = await getEnrichedPlaylists(userId);
      return NextResponse.json({
        playlists: allPlaylists,
        added: newPlaylistsToInsert.length,
        renamed: renamedCount,
        removed: missingPlaylists.map((p) => ({
          playlistName: p.playlistName,
          rulesCount: p.rulesCount,
          reason: apiIds.has(p.playlistId) ? "deselected" : "deleted_in_youtube",
        })),
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error with playlist POST:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Playlist ID is required" }, { status: 400 });
    }

    await db
      .delete(targetPlaylists)
      .where(
        and(
          eq(targetPlaylists.id, id),
          eq(targetPlaylists.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
