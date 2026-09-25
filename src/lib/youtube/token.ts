import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Get a valid YouTube access token for a user.
 * Automatically refreshes the token if it's expired or about to expire.
 */
export async function getValidYouTubeAccessToken(
  userId: string
): Promise<string> {
  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, userId), eq(accounts.provider, "google")),
  });

  if (!account || !account.refreshToken) {
    throw new Error(`No Google account or refresh token found for user: ${userId}`);
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const bufferSeconds = 300; // 5 minute buffer

  // Return existing token if still valid
  if (
    account.expiresAt &&
    account.expiresAt > nowInSeconds + bufferSeconds &&
    account.accessToken
  ) {
    return account.accessToken;
  }

  // Refresh the token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refreshToken,
    }),
  });

  const data = await tokenRes.json();

  if (!tokenRes.ok) {
    throw new Error(`Google token refresh failed: ${JSON.stringify(data)}`);
  }

  const newAccessToken: string = data.access_token;
  const newExpiresAt = nowInSeconds + data.expires_in;

  // Update tokens in database
  await db
    .update(accounts)
    .set({
      accessToken: newAccessToken,
      expiresAt: newExpiresAt,
      // Google may issue a new refresh token
      ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
    })
    .where(
      and(
        eq(accounts.provider, "google"),
        eq(accounts.providerAccountId, account.providerAccountId)
      )
    );

  return newAccessToken;
}
