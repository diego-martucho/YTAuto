import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchedChannels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveChannelId } from "@/lib/youtube/api";
import { getValidYouTubeAccessToken } from "@/lib/youtube/token";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const input = searchParams.get("input")?.trim();

    if (!input) {
      return NextResponse.json({ error: "Parámetro 'input' requerido" }, { status: 400 });
    }

    const accessToken = await getValidYouTubeAccessToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: "No se pudo obtener el token de acceso a YouTube" },
        { status: 403 }
      );
    }

    const channelInfo = await resolveChannelId(accessToken, input);
    if (!channelInfo) {
      return NextResponse.json(
        {
          exists: false,
          error: "El canal no existe en YouTube o no se pudo encontrar.",
        },
        { status: 200 }
      );
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

    return NextResponse.json({
      exists: true,
      channel: channelInfo,
      alreadyAdded: existing.length > 0,
    });
  } catch (error) {
    console.error("Error verifying channel:", error);
    return NextResponse.json(
      { error: "Error interno al verificar el canal" },
      { status: 500 }
    );
  }
}
