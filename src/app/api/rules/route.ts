import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { channelRules, watchedChannels, targetPlaylists } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await db
      .select({
        id: channelRules.id,
        watchedChannelId: channelRules.watchedChannelId,
        targetPlaylistId: channelRules.targetPlaylistId,
        filterType: channelRules.filterType,
        filterValue: channelRules.filterValue,
        isActive: channelRules.isActive,
        createdAt: channelRules.createdAt,
        updatedAt: channelRules.updatedAt,
        channelName: watchedChannels.channelName,
        playlistName: targetPlaylists.playlistName,
      })
      .from(channelRules)
      .innerJoin(watchedChannels, eq(channelRules.watchedChannelId, watchedChannels.id))
      .innerJoin(targetPlaylists, eq(channelRules.targetPlaylistId, targetPlaylists.id))
      .where(eq(watchedChannels.userId, session.user.id))
      .orderBy(desc(channelRules.createdAt));

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Error fetching rules:", error);
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
    const { watchedChannelId, targetPlaylistId, filterType, filterValue } = body;

    if (!watchedChannelId || !targetPlaylistId) {
      return NextResponse.json({ error: "Channel and Playlist IDs are required" }, { status: 400 });
    }

    const channel = await db.query.watchedChannels.findFirst({
      where: and(eq(watchedChannels.id, watchedChannelId), eq(watchedChannels.userId, userId))
    });
    if (!channel) {
      return NextResponse.json({ error: "Channel not found or unauthorized" }, { status: 403 });
    }

    const playlist = await db.query.targetPlaylists.findFirst({
      where: and(eq(targetPlaylists.id, targetPlaylistId), eq(targetPlaylists.userId, userId))
    });
    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found or unauthorized" }, { status: 403 });
    }

    const [newRule] = await db
      .insert(channelRules)
      .values({
        watchedChannelId,
        targetPlaylistId,
        filterType: filterType || "all",
        filterValue: filterValue || null,
      })
      .returning();

    return NextResponse.json(newRule, { status: 201 });
  } catch (error) {
    console.error("Error creating rule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const { id, isActive, filterType, filterValue } = body;

    if (!id) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    }

    const rule = await db
      .select({ id: channelRules.id })
      .from(channelRules)
      .innerJoin(watchedChannels, eq(channelRules.watchedChannelId, watchedChannels.id))
      .where(and(eq(channelRules.id, id), eq(watchedChannels.userId, userId)))
      .limit(1);

    if (rule.length === 0) {
      return NextResponse.json({ error: "Rule not found or unauthorized" }, { status: 403 });
    }

    const updates: any = {
      updatedAt: new Date(),
    };
    if (isActive !== undefined) updates.isActive = isActive;
    if (filterType !== undefined) updates.filterType = filterType;
    if (filterValue !== undefined) updates.filterValue = filterValue;

    const [updatedRule] = await db
      .update(channelRules)
      .set(updates)
      .where(eq(channelRules.id, id))
      .returning();

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error("Error updating rule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    }

    const rule = await db
      .select({ id: channelRules.id })
      .from(channelRules)
      .innerJoin(watchedChannels, eq(channelRules.watchedChannelId, watchedChannels.id))
      .where(and(eq(channelRules.id, id), eq(watchedChannels.userId, userId)))
      .limit(1);

    if (rule.length === 0) {
      return NextResponse.json({ error: "Rule not found or unauthorized" }, { status: 403 });
    }

    await db
      .delete(channelRules)
      .where(eq(channelRules.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting rule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
