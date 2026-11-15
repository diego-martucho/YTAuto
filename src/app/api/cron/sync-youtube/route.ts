import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, userSettings, syncLogs } from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { getValidYouTubeAccessToken, TokenRevokedError } from "@/lib/youtube/token";
import { runUserSync } from "@/lib/sync/run-user-sync";

export const maxDuration = 300; // 5 minutes max on Vercel Hobby

/**
 * Solo Vercel Cron y el workflow de GitHub (que envían `Authorization: Bearer <CRON_SECRET>`)
 * pueden disparar la sincronización. Sin esto, cualquiera podía llamar a `?force=true`
 * y consumir la cuota diaria de YouTube.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Cron: CRON_SECRET no está configurado; se rechaza la solicitud.");
    return false;
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  const startedAt = new Date();

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    const allUsers = await db.select().from(users);
    let totalAdded = 0;
    let skippedAlreadySyncedToday = 0;
    let skippedNotTimeYet = 0;

    for (const user of allUsers) {
      // Verificar horario configurado por el usuario y guardia de ejecución única diaria
      if (!force) {
        const [settingsResult] = await db
          .select({
            timezone: userSettings.timezone,
            syncTime: userSettings.syncTime,
            updatedAt: userSettings.updatedAt,
          })
          .from(userSettings)
          .where(eq(userSettings.userId, user.id))
          .limit(1);

        const tz = settingsResult?.timezone || "America/Argentina/Buenos_Aires";
        const syncTimeStr = settingsResult?.syncTime || "06:00";
        const [targetHourStr, targetMinStr] = syncTimeStr.split(":");
        const targetHour = parseInt(targetHourStr || "6", 10);
        const targetMin = parseInt(targetMinStr || "0", 10);

        const hourFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23",
        });
        const hParts = hourFormatter.formatToParts(startedAt);
        const currentHour = parseInt(hParts.find((p) => p.type === "hour")?.value || "0", 10);
        const currentMin = parseInt(hParts.find((p) => p.type === "minute")?.value || "0", 10);
        const currentSec = parseInt(hParts.find((p) => p.type === "second")?.value || "0", 10);

        const currentTotalMins = currentHour * 60 + currentMin;
        const targetTotalMins = targetHour * 60 + targetMin;

        // 1. Si todavía no llegó la hora configurada por el usuario en su zona horaria, saltar
        if (currentTotalMins < targetTotalMins) {
          skippedNotTimeYet++;
          continue;
        }

        // 2. Inicio del día actual en la zona horaria del usuario
        const todayStart = new Date(
          startedAt.getTime() - (currentHour * 3600 + currentMin * 60 + currentSec) * 1000
        );
        const todayScheduledAt = new Date(
          todayStart.getTime() + (targetHour * 3600 + targetMin * 60) * 1000
        );

        // Si el usuario modificó su horario hoy para más tarde, permitimos ejecutar en el nuevo horario;
        // de lo contrario, máximo 1 ejecución automática en todo el día.
        const settingsUpdatedToday =
          settingsResult?.updatedAt && settingsResult.updatedAt >= todayStart;
        const checkSince = settingsUpdatedToday ? todayScheduledAt : todayStart;

        const existingAutoToday = await db
          .select({ id: syncLogs.id })
          .from(syncLogs)
          .where(
            and(
              eq(syncLogs.userId, user.id),
              eq(syncLogs.executionType, "auto"),
              gte(syncLogs.startedAt, checkSince)
            )
          )
          .orderBy(desc(syncLogs.startedAt))
          .limit(1);

        if (existingAutoToday.length > 0) {
          console.log(`Cron: Usuario ${user.id} ya tuvo su ejecución automática hoy. Saltando.`);
          skippedAlreadySyncedToday++;
          continue;
        }
      }


      // Validar el token antes de crear el registro de ejecución
      try {
        await getValidYouTubeAccessToken(user.id);
      } catch (tokenErr) {
        if (tokenErr instanceof TokenRevokedError) {
          console.warn(`Cron: Token revocado para usuario ${user.id}. Saltando.`);
          continue;
        }
        console.error(`Cron: Error obteniendo token para usuario ${user.id}:`, tokenErr);
        continue;
      }

      try {
        const result = await runUserSync(user.id, "auto");
        totalAdded += result.videosAdded;
      } catch (syncErr) {
        console.error(`Cron: Error sincronizando usuario ${user.id}:`, syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      totalAdded,
      skippedAlreadySyncedToday,
      skippedNotTimeYet,
    });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
