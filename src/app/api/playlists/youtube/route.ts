import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { targetPlaylists, channelRules } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getValidYouTubeAccessToken, TokenRevokedError } from "@/lib/youtube/token";
import { getUserPlaylists } from "@/lib/youtube/api";

/**
 * Vista previa de la sincronización de listas (no escribe nada).
 * Devuelve todas las listas de la cuenta de YouTube marcando cuáles ya sigue YTAuto,
 * cuáles cambiaron de nombre, cuáles son nuevas desde la última sincronización y
 * cuáles siguen en YTAuto pero ya no existen en YouTube.
 * Costo: 1 unidad de cuota por cada 50 listas.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    let accessToken: string;
    try {
      accessToken = await getValidYouTubeAccessToken(userId);
    } catch (error) {
      const message =
        error instanceof TokenRevokedError
          ? error.message
          : "No se pudo conectar con YouTube. Revisá la conexión de tu cuenta en Configuración.";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    const [apiPlaylists, tracked] = await Promise.all([
      getUserPlaylists(accessToken),
      db
        .select({
          id: targetPlaylists.id,
          playlistId: targetPlaylists.playlistId,
          playlistName: targetPlaylists.playlistName,
          lastSyncedAt: targetPlaylists.lastSyncedAt,
          createdAt: targetPlaylists.createdAt,
          rulesCount: sql<number>`count(${channelRules.id})::int`,
        })
        .from(targetPlaylists)
        .leftJoin(channelRules, eq(channelRules.targetPlaylistId, targetPlaylists.id))
        .where(eq(targetPlaylists.userId, userId))
        .groupBy(targetPlaylists.id),
    ]);

    const trackedByYtId = new Map(tracked.map((t) => [t.playlistId, t]));
    const apiIds = new Set(apiPlaylists.map((p) => p.id));

    // Referencia para "nueva": la última vez que se sincronizaron las listas
    const lastSync = tracked.reduce<number>((max, t) => {
      const time = (t.lastSyncedAt ?? t.createdAt)?.getTime() ?? 0;
      return Math.max(max, time);
    }, 0);

    const playlists = apiPlaylists
      .map((p) => {
        const t = trackedByYtId.get(p.id);
        const createdAt = p.publishedAt ? new Date(p.publishedAt).getTime() : 0;
        return {
          playlistId: p.id,
          title: p.title,
          description: p.description,
          thumbnailUrl: p.thumbnailUrl,
          itemCount: p.itemCount,
          privacyStatus: p.privacyStatus,
          publishedAt: p.publishedAt,
          tracked: !!t,
          trackedName: t?.playlistName ?? null,
          renamed: !!t && t.playlistName !== p.title,
          rulesCount: t?.rulesCount ?? 0,
          isNew: !t && lastSync > 0 && createdAt > lastSync,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" }));

    const missing = tracked
      .filter((t) => !apiIds.has(t.playlistId))
      .map((t) => ({ playlistId: t.playlistId, playlistName: t.playlistName, rulesCount: t.rulesCount }));

    return NextResponse.json({ playlists, missing, lastSyncedAt: lastSync > 0 ? new Date(lastSync).toISOString() : null });
  } catch (error) {
    console.error("Error previewing YouTube playlists:", error);
    return NextResponse.json({ error: "No se pudieron obtener tus listas de YouTube" }, { status: 500 });
  }
}
