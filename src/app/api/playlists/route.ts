import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { targetPlaylists, channelRules } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getValidYouTubeAccessToken } from "@/lib/youtube/token";
import { getUserPlaylists, createYouTubePlaylist } from "@/lib/youtube/api";
import { normalizeText } from "@/lib/utils";

async function getPlaylistsWithRuleCounts(userId: string) {
  return db
    .select({
      id: targetPlaylists.id,
      userId: targetPlaylists.userId,
      playlistId: targetPlaylists.playlistId,
      playlistName: targetPlaylists.playlistName,
      videosAddedCount: targetPlaylists.videosAddedCount,
      createdAt: targetPlaylists.createdAt,
      rulesCount: sql<number>`count(${channelRules.id})::int`,
      activeRulesCount: sql<number>`count(${channelRules.id}) filter (where ${channelRules.isActive} = true)::int`,
    })
    .from(targetPlaylists)
    .leftJoin(channelRules, eq(channelRules.targetPlaylistId, targetPlaylists.id))
    .where(eq(targetPlaylists.userId, userId))
    .groupBy(targetPlaylists.id);
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const playlists = await getPlaylistsWithRuleCounts(session.user.id);
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
    const { action, name, description, privacyStatus } = body;

    if (action === "sync") {
      const accessToken = await getValidYouTubeAccessToken(userId);
      if (!accessToken) {
        return NextResponse.json({ error: "No valid YouTube access token" }, { status: 403 });
      }

      const apiPlaylists = await getUserPlaylists(accessToken);

      // Google's YouTube Data API v3 blocks access to the native system "Watch Later" (WL) playlist
      // both in playlists.list and playlistItems.insert.
      // If the user doesn't have a custom "Ver más tarde" playlist yet, create one automatically
      // so it appears on sync and works seamlessly with automation rules.
      const hasWatchLater = apiPlaylists.some((p) => {
        const norm = normalizeText(p.title);
        return norm === "ver mas tarde" || norm === "watch later";
      });

      if (!hasWatchLater) {
        try {
          const createdWatchLater = await createYouTubePlaylist(
            accessToken,
            "Ver más tarde",
            "Lista Ver más tarde sincronizada automáticamente por YTAuto",
            "private"
          );
          apiPlaylists.push(createdWatchLater);
        } catch (createErr) {
          console.warn("Could not auto-create 'Ver más tarde' playlist during sync:", createErr);
        }
      }

      const existingPlaylists = await db
        .select()
        .from(targetPlaylists)
        .where(eq(targetPlaylists.userId, userId));

      const existingByYtId = new Map(existingPlaylists.map((p) => [p.playlistId, p]));
      const apiIds = new Set(apiPlaylists.map((p) => p.id));

      // Insert new ones
      const newPlaylistsToInsert = apiPlaylists
        .filter((p) => !existingByYtId.has(p.id))
        .map((p) => ({
          userId,
          playlistId: p.id,
          playlistName: p.title,
        }));

      if (newPlaylistsToInsert.length > 0) {
        await db.insert(targetPlaylists).values(newPlaylistsToInsert);
      }

      // Update renamed playlists
      for (const apiPl of apiPlaylists) {
        const existing = existingByYtId.get(apiPl.id);
        if (existing && existing.playlistName !== apiPl.title) {
          await db
            .update(targetPlaylists)
            .set({ playlistName: apiPl.title })
            .where(eq(targetPlaylists.id, existing.id));
        }
      }

      // Delete missing ones (deleted in YouTube)
      const missingPlaylists = existingPlaylists.filter((p) => !apiIds.has(p.playlistId));
      if (missingPlaylists.length > 0) {
        for (const mp of missingPlaylists) {
          await db.delete(targetPlaylists).where(eq(targetPlaylists.id, mp.id));
        }
      }

      const allPlaylists = await getPlaylistsWithRuleCounts(userId);
      return NextResponse.json(allPlaylists);
    } else if (action === "create") {
      if (!name || !name.trim()) {
        return NextResponse.json({ error: "El nombre de la lista es obligatorio" }, { status: 400 });
      }

      const accessToken = await getValidYouTubeAccessToken(userId);
      if (!accessToken) {
        return NextResponse.json({ error: "No valid YouTube access token" }, { status: 403 });
      }

      const createdYt = await createYouTubePlaylist(
        accessToken,
        name.trim(),
        description || "Lista gestionada por YTAuto",
        privacyStatus || "private"
      );

      const [inserted] = await db
        .insert(targetPlaylists)
        .values({
          userId,
          playlistId: createdYt.id,
          playlistName: createdYt.title,
        })
        .returning();

      return NextResponse.json({ ...inserted, rulesCount: 0, activeRulesCount: 0 }, { status: 201 });
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

