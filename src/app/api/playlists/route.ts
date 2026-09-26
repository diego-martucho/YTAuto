import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { targetPlaylists } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getValidYouTubeAccessToken } from "@/lib/youtube/token";
import { getUserPlaylists } from "@/lib/youtube/api";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const playlists = await db
      .select()
      .from(targetPlaylists)
      .where(eq(targetPlaylists.userId, session.user.id));

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
    const { action, name } = body;

    if (action === "sync") {
      const accessToken = await getValidYouTubeAccessToken(userId);
      if (!accessToken) {
        return NextResponse.json({ error: "No valid YouTube access token" }, { status: 403 });
      }

      const apiPlaylists = await getUserPlaylists(accessToken);
      
      const existingPlaylists = await db
        .select()
        .from(targetPlaylists)
        .where(eq(targetPlaylists.userId, userId));

      const existingIds = new Set(existingPlaylists.map(p => p.playlistId));
      
      const newPlaylistsToInsert = apiPlaylists
        .filter(p => !existingIds.has(p.id))
        .map(p => ({
          userId,
          playlistId: p.id,
          playlistName: p.title,
        }));

      if (newPlaylistsToInsert.length > 0) {
        await db.insert(targetPlaylists).values(newPlaylistsToInsert);
      }

      const allPlaylists = await db
        .select()
        .from(targetPlaylists)
        .where(eq(targetPlaylists.userId, userId));

      return NextResponse.json(allPlaylists);

    } else if (action === "create") {
      return NextResponse.json({ error: "Not implemented" }, { status: 501 });
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
