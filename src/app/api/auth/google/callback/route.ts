import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthClient } from "@/lib/gmail/client";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    console.log("google tokens received:", {
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
    });

    if (!tokens.access_token && !tokens.refresh_token) {
      return NextResponse.json(
        { error: "Google did not return usable tokens" },
        { status: 400 }
      );
    }

    const fallbackEmail = "me";

    const { error } = await supabaseAdmin
      .from("gmail_accounts")
      .upsert(
        {
          email: fallbackEmail,
          access_token: tokens.access_token || null,
          refresh_token: tokens.refresh_token || null,
          scope: tokens.scope || null,
          token_type: tokens.token_type || null,
          expiry_date: tokens.expiry_date || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.redirect("http://localhost:3000/dashboard");
  } catch (error) {
    console.error("Google callback error:", error);

    return NextResponse.json(
      { error: "Failed to authenticate with Google" },
      { status: 500 }
    );
  }
}