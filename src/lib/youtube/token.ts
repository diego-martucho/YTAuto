import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Custom error thrown when the Google refresh token has been
 * revoked or expired (e.g. app in Testing mode → 7-day expiry).
 * Callers should catch this to prompt the user to re-authenticate.
 */
export class TokenRevokedError extends Error {
  constructor(message?: string) {
    super(
      message ||
        "Tu sesión de Google ha expirado. Por favor, cerrá sesión y volvé a iniciar sesión para reconectar tu cuenta."
    );
    this.name = "TokenRevokedError";
  }
}

/**
 * Get a valid YouTube access token for a user.
 * Automatically refreshes the token if it's expired or about to expire.
 *
 * @throws {TokenRevokedError} when the refresh token itself is no longer valid
 */
export async function getValidYouTubeAccessToken(
  userId: string
): Promise<string> {
  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, userId), eq(accounts.provider, "google")),
  });

  if (!account || !account.refresh_token) {
    throw new TokenRevokedError(
      "No se encontró cuenta de Google o refresh token. Iniciá sesión nuevamente."
    );
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const bufferSeconds = 300; // 5 minute buffer

  // Return existing token if still valid
  if (
    account.expires_at &&
    account.expires_at > nowInSeconds + bufferSeconds &&
    account.access_token
  ) {
    return account.access_token;
  }

  // Refresh the token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });

  const data = await tokenRes.json();

  if (!tokenRes.ok) {
    // Detect revoked/expired refresh token specifically
    if (data.error === "invalid_grant") {
      // Clear the broken tokens from DB so the state is clean
      await db
        .update(accounts)
        .set({
          access_token: null,
          expires_at: null,
          refresh_token: null,
        })
        .where(
          and(
            eq(accounts.provider, "google"),
            eq(accounts.providerAccountId, account.providerAccountId)
          )
        );

      throw new TokenRevokedError();
    }

    throw new Error(`Google token refresh failed: ${JSON.stringify(data)}`);
  }

  const newAccessToken: string = data.access_token;
  const newExpiresAt = nowInSeconds + data.expires_in;

  // Update tokens in database
  await db
    .update(accounts)
    .set({
      access_token: newAccessToken,
      expires_at: newExpiresAt,
      // Google may issue a new refresh token
      ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
    })
    .where(
      and(
        eq(accounts.provider, "google"),
        eq(accounts.providerAccountId, account.providerAccountId)
      )
    );

  return newAccessToken;
}

/**
 * Check whether the stored Google token is still usable.
 * Returns a status object without throwing.
 */
export async function checkTokenStatus(
  userId: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const account = await db.query.accounts.findFirst({
      where: and(eq(accounts.userId, userId), eq(accounts.provider, "google")),
    });

    if (!account) {
      return { valid: false, reason: "no_account" };
    }

    if (!account.refresh_token) {
      return { valid: false, reason: "no_refresh_token" };
    }

    // Try to get a valid token (will refresh if needed)
    await getValidYouTubeAccessToken(userId);
    return { valid: true };
  } catch (error) {
    if (error instanceof TokenRevokedError) {
      return { valid: false, reason: "revoked" };
    }
    return { valid: false, reason: "unknown_error" };
  }
}
