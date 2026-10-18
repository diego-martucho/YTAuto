import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  userSettings,
  watchedChannels,
  targetPlaylists,
  channelRules,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export interface YTAutoBackupPayload {
  app: "YTAuto";
  version: number;
  exportedAt: string;
  data: {
    settings: {
      timezone: string;
      syncTime: string;
      notificationsEnabled: boolean;
      notificationEmail: string | null;
    };
    channels: Array<{
      channelId: string;
      channelName: string;
      channelUrl: string | null;
      channelThumbnail: string | null;
      isActive: boolean;
    }>;
    playlists: Array<{
      playlistId: string;
      playlistName: string;
      videosAddedCount: number;
    }>;
    rules: Array<{
      channelId: string;
      channelName: string;
      playlistId: string;
      playlistName: string;
      filterType: "all" | "title_contains" | "title_any_of";
      filterValue: string | null;
      excludeValue: string | null;
      includeShorts: boolean;
      isActive: boolean;
    }>;
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    const channels = await db
      .select()
      .from(watchedChannels)
      .where(eq(watchedChannels.userId, userId));

    const playlists = await db
      .select()
      .from(targetPlaylists)
      .where(eq(targetPlaylists.userId, userId));

    const rules = await db
      .select({
        channelId: watchedChannels.channelId,
        channelName: watchedChannels.channelName,
        playlistId: targetPlaylists.playlistId,
        playlistName: targetPlaylists.playlistName,
        filterType: channelRules.filterType,
        filterValue: channelRules.filterValue,
        excludeValue: channelRules.excludeValue,
        includeShorts: channelRules.includeShorts,
        isActive: channelRules.isActive,
      })
      .from(channelRules)
      .innerJoin(
        watchedChannels,
        eq(channelRules.watchedChannelId, watchedChannels.id)
      )
      .innerJoin(
        targetPlaylists,
        eq(channelRules.targetPlaylistId, targetPlaylists.id)
      )
      .where(eq(watchedChannels.userId, userId));

    const payload: YTAutoBackupPayload = {
      app: "YTAuto",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        settings: {
          timezone: settings?.timezone || "America/Argentina/Buenos_Aires",
          syncTime: settings?.syncTime || "00:00",
          notificationsEnabled: settings?.notificationsEnabled ?? true,
          notificationEmail:
            settings?.notificationEmail || session.user.email || null,
        },
        channels: channels.map((c) => ({
          channelId: c.channelId,
          channelName: c.channelName,
          channelUrl: c.channelUrl,
          channelThumbnail: c.channelThumbnail,
          isActive: c.isActive,
        })),
        playlists: playlists.map((p) => ({
          playlistId: p.playlistId,
          playlistName: p.playlistName,
          videosAddedCount: p.videosAddedCount,
        })),
        rules: rules.map((r) => ({
          channelId: r.channelId,
          channelName: r.channelName,
          playlistId: r.playlistId,
          playlistName: r.playlistName,
          filterType: r.filterType,
          filterValue: r.filterValue,
          excludeValue: r.excludeValue,
          includeShorts: r.includeShorts,
          isActive: r.isActive,
        })),
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error exporting configuration backup:", error);
    return NextResponse.json(
      { error: "No se pudo exportar la configuración" },
      { status: 500 }
    );
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
    const { backup, mode = "merge" } = body as {
      backup: YTAutoBackupPayload;
      mode?: "merge" | "replace";
    };

    if (
      !backup ||
      backup.app !== "YTAuto" ||
      !backup.data ||
      !Array.isArray(backup.data.channels) ||
      !Array.isArray(backup.data.playlists) ||
      !Array.isArray(backup.data.rules)
    ) {
      return NextResponse.json(
        { error: "El archivo no tiene un formato de respaldo válido de YTAuto." },
        { status: 400 }
      );
    }

    // Si el modo es "replace", limpiar primero canales y listas actuales (las reglas se borran en cascada)
    if (mode === "replace") {
      await db.delete(watchedChannels).where(eq(watchedChannels.userId, userId));
      await db.delete(targetPlaylists).where(eq(targetPlaylists.userId, userId));
    }

    // 1. Restaurar preferencias de usuario (userSettings)
    if (backup.data.settings) {
      const s = backup.data.settings;
      const existingSettings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      });

      if (existingSettings) {
        await db
          .update(userSettings)
          .set({
            timezone: s.timezone || "America/Argentina/Buenos_Aires",
            syncTime: s.syncTime || "00:00",
            notificationsEnabled: s.notificationsEnabled ?? true,
            notificationEmail: s.notificationEmail ?? existingSettings.notificationEmail,
            updatedAt: new Date(),
          })
          .where(eq(userSettings.userId, userId));
      } else {
        await db.insert(userSettings).values({
          userId,
          timezone: s.timezone || "America/Argentina/Buenos_Aires",
          syncTime: s.syncTime || "00:00",
          notificationsEnabled: s.notificationsEnabled ?? true,
          notificationEmail: s.notificationEmail || session.user.email || null,
        });
      }
    }

    // 2. Restaurar Canales Monitoreados
    const existingChannels = await db
      .select()
      .from(watchedChannels)
      .where(eq(watchedChannels.userId, userId));

    const channelMap = new Map<string, string>(); // YouTube channelId -> DB watchedChannels.id
    for (const ch of existingChannels) {
      channelMap.set(ch.channelId, ch.id);
    }

    let channelsCreated = 0;
    let channelsUpdated = 0;

    for (const ch of backup.data.channels) {
      if (!ch.channelId || !ch.channelName) continue;

      const existingId = channelMap.get(ch.channelId);
      if (existingId) {
        await db
          .update(watchedChannels)
          .set({
            channelName: ch.channelName,
            channelUrl: ch.channelUrl || `https://youtube.com/channel/${ch.channelId}`,
            channelThumbnail: ch.channelThumbnail ?? null,
            isActive: ch.isActive ?? true,
          })
          .where(eq(watchedChannels.id, existingId));
        channelsUpdated++;
      } else {
        const [inserted] = await db
          .insert(watchedChannels)
          .values({
            userId,
            channelId: ch.channelId,
            channelName: ch.channelName,
            channelUrl: ch.channelUrl || `https://youtube.com/channel/${ch.channelId}`,
            channelThumbnail: ch.channelThumbnail ?? null,
            isActive: ch.isActive ?? true,
          })
          .returning();
        channelMap.set(ch.channelId, inserted.id);
        channelsCreated++;
      }
    }

    // 3. Restaurar Listas de Reproducción
    const existingPlaylists = await db
      .select()
      .from(targetPlaylists)
      .where(eq(targetPlaylists.userId, userId));

    const playlistMap = new Map<string, { id: string; count: number }>(); // YouTube playlistId -> DB info
    for (const pl of existingPlaylists) {
      playlistMap.set(pl.playlistId, { id: pl.id, count: pl.videosAddedCount });
    }

    let playlistsCreated = 0;
    let playlistsUpdated = 0;

    for (const pl of backup.data.playlists) {
      if (!pl.playlistId || !pl.playlistName) continue;

      const existing = playlistMap.get(pl.playlistId);
      if (existing) {
        await db
          .update(targetPlaylists)
          .set({
            playlistName: pl.playlistName,
            videosAddedCount: Math.max(existing.count, pl.videosAddedCount || 0),
          })
          .where(eq(targetPlaylists.id, existing.id));
        playlistsUpdated++;
      } else {
        const [inserted] = await db
          .insert(targetPlaylists)
          .values({
            userId,
            playlistId: pl.playlistId,
            playlistName: pl.playlistName,
            videosAddedCount: pl.videosAddedCount || 0,
          })
          .returning();
        playlistMap.set(pl.playlistId, {
          id: inserted.id,
          count: inserted.videosAddedCount,
        });
        playlistsCreated++;
      }
    }

    // 4. Restaurar Reglas de Organización (vinculando por YouTube channelId y playlistId)
    const currentRules = await db
      .select({
        id: channelRules.id,
        watchedChannelId: channelRules.watchedChannelId,
        targetPlaylistId: channelRules.targetPlaylistId,
        filterType: channelRules.filterType,
        filterValue: channelRules.filterValue,
        excludeValue: channelRules.excludeValue,
      })
      .from(channelRules)
      .innerJoin(
        watchedChannels,
        eq(channelRules.watchedChannelId, watchedChannels.id)
      )
      .where(eq(watchedChannels.userId, userId));

    let rulesCreated = 0;
    let rulesUpdated = 0;

    for (const r of backup.data.rules) {
      if (!r.channelId || !r.playlistId) continue;

      // Si el canal o la lista referenciados en la regla no estaban en los arrays, asegurar que existan
      let dbChannelId = channelMap.get(r.channelId);
      if (!dbChannelId && r.channelName) {
        const [insertedCh] = await db
          .insert(watchedChannels)
          .values({
            userId,
            channelId: r.channelId,
            channelName: r.channelName,
            channelUrl: `https://youtube.com/channel/${r.channelId}`,
            isActive: true,
          })
          .returning();
        dbChannelId = insertedCh.id;
        channelMap.set(r.channelId, dbChannelId);
        channelsCreated++;
      }

      let dbPlaylistInfo = playlistMap.get(r.playlistId);
      if (!dbPlaylistInfo && r.playlistName) {
        const [insertedPl] = await db
          .insert(targetPlaylists)
          .values({
            userId,
            playlistId: r.playlistId,
            playlistName: r.playlistName,
            videosAddedCount: 0,
          })
          .returning();
        dbPlaylistInfo = { id: insertedPl.id, count: 0 };
        playlistMap.set(r.playlistId, dbPlaylistInfo);
        playlistsCreated++;
      }

      if (!dbChannelId || !dbPlaylistInfo) continue;

      const validFilterType: "all" | "title_contains" | "title_any_of" =
        r.filterType === "title_contains" || r.filterType === "title_any_of"
          ? r.filterType
          : "all";
      const normFilterVal =
        validFilterType === "all" ? null : r.filterValue?.trim() || null;
      const normExcludeVal = r.excludeValue?.trim() || null;

      // Buscar si ya existe exactamente la misma regla para no duplicar
      const duplicateRule = currentRules.find(
        (cr) =>
          cr.watchedChannelId === dbChannelId &&
          cr.targetPlaylistId === dbPlaylistInfo.id &&
          cr.filterType === validFilterType &&
          (cr.filterValue || null) === normFilterVal &&
          (cr.excludeValue || null) === normExcludeVal
      );

      if (duplicateRule) {
        await db
          .update(channelRules)
          .set({
            includeShorts: r.includeShorts ?? false,
            isActive: r.isActive ?? true,
            updatedAt: new Date(),
          })
          .where(eq(channelRules.id, duplicateRule.id));
        rulesUpdated++;
      } else {
        const [insertedRule] = await db
          .insert(channelRules)
          .values({
            watchedChannelId: dbChannelId,
            targetPlaylistId: dbPlaylistInfo.id,
            filterType: validFilterType,
            filterValue: normFilterVal,
            excludeValue: normExcludeVal,
            includeShorts: r.includeShorts ?? false,
            isActive: r.isActive ?? true,
          })
          .returning();

        currentRules.push({
          id: insertedRule.id,
          watchedChannelId: insertedRule.watchedChannelId,
          targetPlaylistId: insertedRule.targetPlaylistId,
          filterType: insertedRule.filterType,
          filterValue: insertedRule.filterValue,
          excludeValue: insertedRule.excludeValue,
        });
        rulesCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        channelsCreated,
        channelsUpdated,
        playlistsCreated,
        playlistsUpdated,
        rulesCreated,
        rulesUpdated,
      },
      message: `Configuración restaurada: ${channelsCreated + channelsUpdated} canales, ${playlistsCreated + playlistsUpdated} listas y ${rulesCreated + rulesUpdated} reglas.`,
    });
  } catch (error) {
    console.error("Error importing configuration backup:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al importar el archivo de configuración" },
      { status: 500 }
    );
  }
}
