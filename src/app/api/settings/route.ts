import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkTokenStatus } from "@/lib/youtube/token";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
    });

    if (!settings) {
      const [newSettings] = await db
        .insert(userSettings)
        .values({
          userId: session.user.id,
          timezone: "America/Argentina/Buenos_Aires",
          syncTime: "00:00",
          notificationsEnabled: true,
          notificationEmail: session.user.email || null,
        })
        .returning();
      settings = newSettings;
    }

    // Check Google OAuth token status
    const tokenStatus = await checkTokenStatus(session.user.id);

    return NextResponse.json({ ...settings, tokenStatus });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { syncTime, timezone, notificationsEnabled, notificationEmail } = body;

    const updates: Partial<typeof userSettings.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (syncTime !== undefined) updates.syncTime = syncTime;
    if (timezone !== undefined) updates.timezone = timezone;
    if (notificationsEnabled !== undefined) updates.notificationsEnabled = notificationsEnabled;
    if (notificationEmail !== undefined) updates.notificationEmail = notificationEmail;

    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
    });

    let result;
    if (existing) {
      const [updated] = await db
        .update(userSettings)
        .set(updates)
        .where(eq(userSettings.userId, session.user.id))
        .returning();
      result = updated;
    } else {
      const [created] = await db
        .insert(userSettings)
        .values({
          userId: session.user.id,
          syncTime: syncTime || "00:00",
          timezone: timezone || "America/Argentina/Buenos_Aires",
          notificationsEnabled: notificationsEnabled ?? true,
          notificationEmail: notificationEmail || session.user.email || null,
        })
        .returning();
      result = created;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
