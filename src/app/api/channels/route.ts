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

    if (!input || !input.trim()) {
      return NextResponse.json({ error: "Debes ingresar una URL, @handle o ID de canal" }, { status: 400 });
    }

    const accessToken = await getValidYouTubeAccessToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json({ error: "No se pudo obtener el token de acceso a YouTube. Inicia sesión nuevamente." }, { status: 403 });
    }

    const channelInfo = await resolveChannelId(accessToken, input.trim());
    if (!channelInfo) {
      return NextResponse.json({ error: "El canal no existe en YouTube o no se pudo encontrar" }, { status: 404 });
    }

    const existing = await db
      .select({ id: watchedChannels.id })
      .from(watchedChannels)
      .where(
        and(
          eq(watchedChannels.userId, session.user.id),
          eq(watchedChannels.channelId, channelInfo.channelId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `El canal "${channelInfo.channelName}" ya está en tu lista de canales monitorizados` },
        { status: 409 }
      );
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

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, isActive } = body;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  await db.update(watchedChannels).set({ isActive }).where(and(eq(watchedChannels.id, id), eq(watchedChannels.userId, session.user.id)));
  return NextResponse.json({ success: true });
}
