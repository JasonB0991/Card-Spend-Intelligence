import { NextResponse } from "next/server";
import { getGoogleOAuthClient } from "@/lib/gmail/client";

export async function GET() {
  const oauth2Client = getGoogleOAuthClient();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  return NextResponse.redirect(url);
}