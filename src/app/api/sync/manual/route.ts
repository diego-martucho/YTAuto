import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getValidYouTubeAccessToken, TokenRevokedError } from "@/lib/youtube/token";
import { runUserSync } from "@/lib/sync/run-user-sync";

export const maxDuration = 300; // 5 minutos máx. en Vercel Hobby (fluid compute)

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Validate token upfront — fail fast with a clear message if revoked
    try {
      await getValidYouTubeAccessToken(userId);
    } catch (error) {
      if (error instanceof TokenRevokedError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      return NextResponse.json(
        { error: "No se pudo obtener el token de acceso a YouTube. Inicia sesión nuevamente." },
        { status: 403 }
      );
    }

    const result = await runUserSync(userId, "manual");

    if (!result.syncLogId) {
      return NextResponse.json({
        success: true,
        ...result,
        message: "No tienes canales activos para sincronizar.",
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
      message: `Sincronización completada: ${result.videosAdded} ${
        result.videosAdded === 1 ? "video agregado" : "videos agregados"
      }.`,
    });
  } catch (error: unknown) {
    console.error("Error en sincronización manual:", error);
    if (error instanceof TokenRevokedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const msg = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
