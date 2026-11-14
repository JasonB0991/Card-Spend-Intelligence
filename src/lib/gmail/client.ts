import { google } from "googleapis";
import type { Credentials } from "google-auth-library";

export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
}

export function getGmailClient(
  tokens?: {
    access_token?: string | null;
    refresh_token?: string | null;
  },
  onTokens?: (tokens: Credentials) => void
) {
  const auth = getGoogleOAuthClient();

  if (tokens) {
    auth.setCredentials({
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
    });
  }

  if (onTokens) {
    auth.on("tokens", onTokens);
  }

  return google.gmail({
    version: "v1",
    auth,
  });
}
