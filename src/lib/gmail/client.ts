import { google } from "googleapis";

export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getGmailClient(tokens?: {
  access_token?: string | null;
  refresh_token?: string | null;
}) {
  const auth = getGoogleOAuthClient();

  if (tokens) {
    auth.setCredentials({
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
    });
  }

  return google.gmail({
    version: "v1",
    auth,
  });
}