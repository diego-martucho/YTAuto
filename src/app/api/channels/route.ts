import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchedChannels } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { resolveChannelId } from "@/lib/youtube/api";
import { getValidYouTubeAccessToken } from "@/lib/youtube/token";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await db
      .select()
      .from(watchedChannels)
      .where(eq(watchedChannels.userId, session.user.id))
      .orderBy(desc(watchedChannels.createdAt));

    return NextResponse.json(channels);
  } catch (error) {
    console.error("Error fetching channels:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { input } = body;

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const accessToken = await getValidYouTubeAccessToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json({ error: "No valid YouTube access token" }, { status: 403 });
    }

    const channelInfo = await resolveChannelId(accessToken, input);
    if (!channelInfo) {
      return NextResponse.json({ error: "Could not resolve channel" }, { status: 404 });
    }

    const [newChannel] = await db
      .insert(watchedChannels)
      .values({
        userId: session.user.id,
        channelId: channelInfo.channelId,
        channelName: channelInfo.channelName,
        channelUrl: `https://youtube.com/channel/${channelInfo.channelId}`,
        channelThumbnail: channelInfo.thumbnail,
      })
      .returning();

    return NextResponse.json(newChannel, { status: 201 });
  } catch (error) {
    console.error("Error adding channel:", error);
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
      return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
    }

    await db
      .delete(watchedChannels)
      .where(
        and(
          eq(watchedChannels.id, id),
          eq(watchedChannels.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting channel:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
