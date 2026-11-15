import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  userSettings,
  watchedChannels,
  targetPlaylists,
  channelRules,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getValidYouTubeAccessToken } from "@/lib/youtube/token";
import { getUserPlaylists, type YouTubePlaylist } from "@/lib/youtube/api";

export const maxDuration = 60;

/** Límite de elementos por colección para evitar archivos abusivos. */
const MAX_ITEMS = 5000;

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

// ─── Sanitización del archivo importado ──────────────────────────────

function str(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value.slice(0, MAX_ITEMS) : [];
}

const FILTER_TYPES = ["all", "title_contains", "title_any_of"] as const;
type FilterType = (typeof FILTER_TYPES)[number];

function ruleKey(channelYtId: string, playlistYtId: string, filterType: string, filterValue: string | null, excludeValue: string | null) {
  return JSON.stringify([channelYtId, playlistYtId, filterType, filterValue ?? null, excludeValue ?? null]);
}

/**
 * Importa un respaldo.
 *
 * - Todas las escrituras se envían en un único `db.batch`, que Neon ejecuta como una transacción:
 *   si algo falla no queda nada a medias.
 * - "replace" ya no borra todo antes de importar: sincroniza contra el archivo (crea/actualiza lo que
 *   viene y elimina solo lo que no está). Las reglas idénticas se conservan, y con ellas su historial.
 * - Las listas se validan contra tu cuenta de YouTube: las que no existen allí se omiten (junto con sus
 *   reglas), porque la próxima "Sincronizar listas" las eliminaría igualmente.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const backup = body?.backup as YTAutoBackupPayload | undefined;
    const mode: "merge" | "replace" = body?.mode === "replace" ? "replace" : "merge";
    const includeSettings = body?.includeSettings !== false;

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

    // ── 1. Listas reales de la cuenta de YouTube (1 unidad de cuota cada 50 listas) ──
    let ytPlaylists: YouTubePlaylist[];
    try {
      const accessToken = await getValidYouTubeAccessToken(userId);
      ytPlaylists = await getUserPlaylists(accessToken);
    } catch (e) {
      console.error("Backup import: no se pudieron obtener las listas de YouTube:", e);
      return NextResponse.json(
        {
          error:
            "No se pudieron verificar tus listas en YouTube. Revisá la conexión de tu cuenta en Configuración y volvé a intentar.",
        },
        { status: 502 }
      );
    }
    const ytById = new Map(ytPlaylists.map((p) => [p.id, p]));

    // ── 2. Estado actual ──
    const [existingChannels, existingPlaylists, existingRules] = await Promise.all([
      db.select().from(watchedChannels).where(eq(watchedChannels.userId, userId)),
      db.select().from(targetPlaylists).where(eq(targetPlaylists.userId, userId)),
      db
        .select({
          id: channelRules.id,
          channelYtId: watchedChannels.channelId,
          playlistYtId: targetPlaylists.playlistId,
          filterType: channelRules.filterType,
          filterValue: channelRules.filterValue,
          excludeValue: channelRules.excludeValue,
        })
        .from(channelRules)
        .innerJoin(watchedChannels, eq(channelRules.watchedChannelId, watchedChannels.id))
        .innerJoin(targetPlaylists, eq(channelRules.targetPlaylistId, targetPlaylists.id))
        .where(eq(watchedChannels.userId, userId)),
    ]);

    const channelByYtId = new Map(existingChannels.map((c) => [c.channelId, c]));
    const playlistByYtId = new Map(existingPlaylists.map((p) => [p.playlistId, p]));
    const ruleByKey = new Map(
      existingRules.map((r) => [ruleKey(r.channelYtId, r.playlistYtId, r.filterType, r.filterValue, r.excludeValue), r])
    );

    // ── 3. Plan de escrituras (todo en memoria; nada se escribe todavía) ──
    const now = new Date();
    const channelIdMap = new Map<string, string>(); // YouTube channelId -> watched_channels.id
    const playlistIdMap = new Map<string, string>(); // YouTube playlistId -> target_playlists.id
    const channelInserts: (typeof watchedChannels.$inferInsert)[] = [];
    const playlistInserts: (typeof targetPlaylists.$inferInsert)[] = [];
    const ruleInserts: (typeof channelRules.$inferInsert)[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any[] = [];
    const keptChannelIds = new Set<string>();
    const keptPlaylistIds = new Set<string>();
    const keptRuleIds = new Set<string>();
    const skippedPlaylists = new Map<string, string>(); // YouTube playlistId -> nombre
    let skippedRules = 0;

    const summary = {
      channelsCreated: 0,
      channelsUpdated: 0,
      channelsDeleted: 0,
      playlistsCreated: 0,
      playlistsUpdated: 0,
      playlistsDeleted: 0,
      rulesCreated: 0,
      rulesUpdated: 0,
      rulesDeleted: 0,
    };

    const upsertChannel = (raw: { channelId: string; channelName: string; channelUrl?: string | null; channelThumbnail?: string | null; isActive?: boolean }, fromRule = false) => {
      if (channelIdMap.has(raw.channelId)) return;
      const existing = channelByYtId.get(raw.channelId);
      const channelUrl = raw.channelUrl || `https://youtube.com/channel/${raw.channelId}`;
      if (existing) {
        channelIdMap.set(raw.channelId, existing.id);
        keptChannelIds.add(existing.id);
        if (!fromRule) {
          updates.push(
            db
              .update(watchedChannels)
              .set({
                channelName: raw.channelName,
                channelUrl,
                channelThumbnail: raw.channelThumbnail ?? existing.channelThumbnail,
                isActive: raw.isActive ?? true,
              })
              .where(eq(watchedChannels.id, existing.id))
          );
          summary.channelsUpdated++;
        }
      } else {
        const id = crypto.randomUUID();
        channelIdMap.set(raw.channelId, id);
        keptChannelIds.add(id);
        channelInserts.push({
          id,
          userId,
          channelId: raw.channelId,
          channelName: raw.channelName,
          channelUrl,
          channelThumbnail: raw.channelThumbnail ?? null,
          isActive: raw.isActive ?? true,
        });
        summary.channelsCreated++;
      }
    };

    const upsertPlaylist = (ytId: string, fallbackName: string, videosAddedCount = 0): boolean => {
      if (playlistIdMap.has(ytId)) return true;
      const yt = ytById.get(ytId);
      if (!yt) {
        skippedPlaylists.set(ytId, fallbackName);
        return false;
      }
      const metadata = {
        playlistName: yt.title,
        description: yt.description || null,
        thumbnailUrl: yt.thumbnailUrl || null,
        itemCount: yt.itemCount,
        privacyStatus: yt.privacyStatus,
        lastSyncedAt: now,
      };
      const existing = playlistByYtId.get(ytId);
      if (existing) {
        playlistIdMap.set(ytId, existing.id);
        keptPlaylistIds.add(existing.id);
        updates.push(
          db
            .update(targetPlaylists)
            .set({ ...metadata, videosAddedCount: Math.max(existing.videosAddedCount, videosAddedCount) })
            .where(eq(targetPlaylists.id, existing.id))
        );
        summary.playlistsUpdated++;
      } else {
        const id = crypto.randomUUID();
        playlistIdMap.set(ytId, id);
        keptPlaylistIds.add(id);
        playlistInserts.push({ id, userId, playlistId: ytId, videosAddedCount, ...metadata });
        summary.playlistsCreated++;
      }
      return true;
    };

    // Canales
    for (const raw of list(backup.data.channels)) {
      const c = raw as Record<string, unknown>;
      const channelId = str(c.channelId, 64);
      const channelName = str(c.channelName);
      if (!channelId || !channelName) continue;
      upsertChannel({
        channelId,
        channelName,
        channelUrl: str(c.channelUrl, 300),
        channelThumbnail: str(c.channelThumbnail, 1000),
        isActive: bool(c.isActive, true),
      });
    }

    // Listas
    for (const raw of list(backup.data.playlists)) {
      const p = raw as Record<string, unknown>;
      const playlistId = str(p.playlistId, 64);
      if (!playlistId) continue;
      const count = typeof p.videosAddedCount === "number" && p.videosAddedCount > 0 ? Math.floor(p.videosAddedCount) : 0;
      upsertPlaylist(playlistId, str(p.playlistName) ?? playlistId, count);
    }

    // Reglas
    for (const raw of list(backup.data.rules)) {
      const r = raw as Record<string, unknown>;
      const channelYtId = str(r.channelId, 64);
      const playlistYtId = str(r.playlistId, 64);
      if (!channelYtId || !playlistYtId) continue;

      // La lista debe existir en tu cuenta de YouTube
      if (!upsertPlaylist(playlistYtId, str(r.playlistName) ?? playlistYtId)) {
        skippedRules++;
        continue;
      }

      // Si el canal no venía en el arreglo de canales, se crea a partir de la regla
      if (!channelIdMap.has(channelYtId)) {
        const channelName = str(r.channelName);
        if (!channelName) {
          skippedRules++;
          continue;
        }
        upsertChannel({ channelId: channelYtId, channelName }, true);
      }

      const filterType: FilterType = FILTER_TYPES.includes(r.filterType as FilterType) ? (r.filterType as FilterType) : "all";
      const filterValue = filterType === "all" ? null : str(r.filterValue, 1000);
      const excludeValue = str(r.excludeValue, 1000);
      if (filterType !== "all" && !filterValue) {
        skippedRules++;
        continue;
      }

      const key = ruleKey(channelYtId, playlistYtId, filterType, filterValue, excludeValue);
      const existing = ruleByKey.get(key);
      if (existing) {
        if (keptRuleIds.has(existing.id)) continue; // regla repetida dentro del archivo
        keptRuleIds.add(existing.id);
        updates.push(
          db
            .update(channelRules)
            .set({ includeShorts: bool(r.includeShorts, false), isActive: bool(r.isActive, true), updatedAt: now })
            .where(eq(channelRules.id, existing.id))
        );
        summary.rulesUpdated++;
      } else {
        const id = crypto.randomUUID();
        ruleByKey.set(key, { id, channelYtId, playlistYtId, filterType, filterValue, excludeValue });
        keptRuleIds.add(id);
        ruleInserts.push({
          id,
          watchedChannelId: channelIdMap.get(channelYtId)!,
          targetPlaylistId: playlistIdMap.get(playlistYtId)!,
          filterType,
          filterValue,
          excludeValue,
          includeShorts: bool(r.includeShorts, false),
          isActive: bool(r.isActive, true),
        });
        summary.rulesCreated++;
      }
    }

    // Modo "replace": eliminar únicamente lo que no está en el archivo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deletes: any[] = [];
    if (mode === "replace") {
      const rulesToDelete = existingRules.filter((r) => !keptRuleIds.has(r.id)).map((r) => r.id);
      const channelsToDelete = existingChannels.filter((c) => !keptChannelIds.has(c.id)).map((c) => c.id);
      const playlistsToDelete = existingPlaylists.filter((p) => !keptPlaylistIds.has(p.id)).map((p) => p.id);
      if (rulesToDelete.length > 0) deletes.push(db.delete(channelRules).where(inArray(channelRules.id, rulesToDelete)));
      if (channelsToDelete.length > 0)
        deletes.push(db.delete(watchedChannels).where(and(eq(watchedChannels.userId, userId), inArray(watchedChannels.id, channelsToDelete))));
      if (playlistsToDelete.length > 0)
        deletes.push(db.delete(targetPlaylists).where(and(eq(targetPlaylists.userId, userId), inArray(targetPlaylists.id, playlistsToDelete))));
      summary.rulesDeleted = rulesToDelete.length;
      summary.channelsDeleted = channelsToDelete.length;
      summary.playlistsDeleted = playlistsToDelete.length;
    }

    // Preferencias
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settingsStatements: any[] = [];
    if (includeSettings && backup.data.settings) {
      const s = backup.data.settings as unknown as Record<string, unknown>;
      const syncTime = str(s.syncTime, 5);
      const values = {
        timezone: str(s.timezone, 64) || "America/Argentina/Buenos_Aires",
        syncTime: syncTime && /^\d{2}:\d{2}$/.test(syncTime) ? syncTime : "06:00",
        notificationsEnabled: bool(s.notificationsEnabled, true),
        updatedAt: now,
      };
      settingsStatements.push(
        db
          .insert(userSettings)
          .values({ userId, ...values, notificationEmail: str(s.notificationEmail, 320) || session.user.email || null })
          .onConflictDoUpdate({ target: userSettings.userId, set: values })
      );
    }

    // ── 4. Ejecutar todo en una única transacción ──
    const statements = [
      ...(channelInserts.length > 0 ? [db.insert(watchedChannels).values(channelInserts)] : []),
      ...(playlistInserts.length > 0 ? [db.insert(targetPlaylists).values(playlistInserts)] : []),
      ...updates,
      ...(ruleInserts.length > 0 ? [db.insert(channelRules).values(ruleInserts)] : []),
      ...deletes,
      ...settingsStatements,
    ];

    if (statements.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.batch(statements as [any, ...any[]]);
    }

    const warnings: string[] = [];
    if (skippedPlaylists.size > 0) {
      warnings.push(
        `Se omitieron ${skippedPlaylists.size} ${skippedPlaylists.size === 1 ? "lista que no existe" : "listas que no existen"} en tu cuenta de YouTube` +
          (skippedRules > 0 ? ` y ${skippedRules} ${skippedRules === 1 ? "regla" : "reglas"} asociadas` : "") +
          `: ${[...skippedPlaylists.values()].slice(0, 5).join(", ")}${skippedPlaylists.size > 5 ? "…" : ""}`
      );
    } else if (skippedRules > 0) {
      warnings.push(`Se omitieron ${skippedRules} ${skippedRules === 1 ? "regla inválida" : "reglas inválidas"}.`);
    }

    const totalChannels = summary.channelsCreated + summary.channelsUpdated;
    const totalPlaylists = summary.playlistsCreated + summary.playlistsUpdated;
    const totalRules = summary.rulesCreated + summary.rulesUpdated;
    const deletedTotal = summary.channelsDeleted + summary.playlistsDeleted + summary.rulesDeleted;

    return NextResponse.json({
      success: true,
      summary: { ...summary, skippedPlaylists: skippedPlaylists.size, skippedRules },
      warnings,
      message:
        `Configuración restaurada: ${totalChannels} canales, ${totalPlaylists} listas y ${totalRules} reglas` +
        (summary.rulesCreated > 0 ? ` (${summary.rulesCreated} nuevas)` : "") +
        (deletedTotal > 0 ? `. Se eliminaron ${deletedTotal} elementos que no estaban en el archivo.` : "."),
    });
  } catch (error) {
    console.error("Error importing configuration backup:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al importar el archivo. No se aplicó ningún cambio." },
      { status: 500 }
    );
  }
}
