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
        excludeValue: channelRules.excludeValue,
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
    const { watchedChannelId, targetPlaylistId, filterType, filterValue, excludeValue } = body;

    if (!watchedChannelId || !targetPlaylistId) {
      return NextResponse.json({ error: "Canal y lista son requeridos" }, { status: 400 });
    }

    const channel = await db.query.watchedChannels.findFirst({
      where: and(eq(watchedChannels.id, watchedChannelId), eq(watchedChannels.userId, userId))
    });
    if (!channel) {
      return NextResponse.json({ error: "Canal no encontrado o no autorizado" }, { status: 403 });
    }

    const playlist = await db.query.targetPlaylists.findFirst({
      where: and(eq(targetPlaylists.id, targetPlaylistId), eq(targetPlaylists.userId, userId))
    });
    if (!playlist) {
      return NextResponse.json({ error: "Lista no encontrada o no autorizada" }, { status: 403 });
    }

    const [newRule] = await db
      .insert(channelRules)
      .values({
        watchedChannelId,
        targetPlaylistId,
        filterType: filterType || "all",
        filterValue: filterValue ? filterValue.trim() : null,
        excludeValue: excludeValue ? excludeValue.trim() : null,
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
    const { id, watchedChannelId, targetPlaylistId, isActive, filterType, filterValue, excludeValue } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de regla requerido" }, { status: 400 });
    }

    const rule = await db
      .select({ id: channelRules.id })
      .from(channelRules)
      .innerJoin(watchedChannels, eq(channelRules.watchedChannelId, watchedChannels.id))
      .where(and(eq(channelRules.id, id), eq(watchedChannels.userId, userId)))
      .limit(1);

    if (rule.length === 0) {
      return NextResponse.json({ error: "Regla no encontrada o no autorizada" }, { status: 403 });
    }

    const updates: Partial<typeof channelRules.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (watchedChannelId) {
      const channel = await db.query.watchedChannels.findFirst({
        where: and(eq(watchedChannels.id, watchedChannelId), eq(watchedChannels.userId, userId))
      });
      if (!channel) return NextResponse.json({ error: "Canal no válido" }, { status: 400 });
      updates.watchedChannelId = watchedChannelId;
    }

    if (targetPlaylistId) {
      const playlist = await db.query.targetPlaylists.findFirst({
        where: and(eq(targetPlaylists.id, targetPlaylistId), eq(targetPlaylists.userId, userId))
      });
      if (!playlist) return NextResponse.json({ error: "Lista no válida" }, { status: 400 });
      updates.targetPlaylistId = targetPlaylistId;
    }

    if (isActive !== undefined) updates.isActive = isActive;
    if (filterType !== undefined) updates.filterType = filterType;
    if (filterValue !== undefined) updates.filterValue = filterValue ? filterValue.trim() : null;
    if (excludeValue !== undefined) updates.excludeValue = excludeValue ? excludeValue.trim() : null;

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
