import type { gmail_v1 } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getGmailClient } from "@/lib/gmail/client";

function extractHeader(
  headers: Array<{ name?: string | null; value?: string | null }> = [],
  name: string
) {
  return (
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ||
    null
  );
}

function decodeBase64Url(data: string) {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getPlainTextFromPayload(payload: any): string {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts?.length) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }

    for (const part of payload.parts) {
      const nested = getPlainTextFromPayload(part);
      if (nested) return nested;
    }
  }

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  return "";
}

function getHtmlFromPayload(payload: any): string {
  if (!payload) return "";

  if (payload.mimeType === "text/html" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts?.length) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }

    for (const part of payload.parts) {
      const nested = getHtmlFromPayload(part);
      if (nested) return nested;
    }
  }

  return "";
}

/**
 * Only these senders are fetched from Gmail. Keep in sync with the `from`
 * checks in parser.ts and platform-parser.ts.
 */
export const BANK_SENDERS = [
  "alerts@hdfcbank.bank.in",
  "credit_cards@icicibank.com",
  "onlinesbicard@sbicard.com",
  "noreply@idfcfirstbank.com",
  "alerts@yes.bank.in",
];

export const PLATFORM_SENDERS = [
  "no-reply@swiggy.in",
  "noreply@swiggy.in",
  "noreply@zomato.com",
  "auto-confirm@amazon.in",
  "no-reply@rmt.flipkart.com",
  "no-reply@agoda.com",
];

export const SUPPORTED_SENDERS = [...BANK_SENDERS, ...PLATFORM_SENDERS];

const GMAIL_QUERY = `from:(${SUPPORTED_SENDERS.join(" OR ")}) newer_than:180d`;

export class GmailReauthRequiredError extends Error {
  constructor() {
    super(
      "Gmail access is missing or expired. Please sign out and sign in again, and allow Gmail access."
    );
    this.name = "GmailReauthRequiredError";
  }
}

export async function syncEmailsFromGmail(userId: string) {
  const { data: account, error: accountError } = await supabaseAdmin
    .from("gmail_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (accountError || !account || (!account.refresh_token && !account.access_token)) {
    throw new GmailReauthRequiredError();
  }

  const gmail = getGmailClient(
    {
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    },
    // Persist refreshed access tokens so we don't refresh on every run.
    (tokens) => {
      void supabaseAdmin
        .from("gmail_accounts")
        .update({
          access_token: tokens.access_token ?? account.access_token,
          ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
          expiry_date: tokens.expiry_date ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  );

  let messages: { id?: string | null }[] = [];
  try {
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: GMAIL_QUERY,
      maxResults: 50,
    });
    messages = listResponse.data.messages || [];
  } catch (err) {
    const message = String((err as { message?: string })?.message || err);
    if (
      message.includes("invalid_grant") ||
      message.includes("No refresh token") ||
      message.includes("insufficient authentication scopes")
    ) {
      throw new GmailReauthRequiredError();
    }
    throw err;
  }

  // Skip messages we already stored, to avoid re-downloading them.
  const ids = messages.map((m) => m.id).filter((id): id is string => !!id);
  const { data: existingRows } = ids.length
    ? await supabaseAdmin
        .from("emails")
        .select("gmail_message_id")
        .eq("user_id", userId)
        .in("gmail_message_id", ids)
    : { data: [] };
  const existing = new Set((existingRows || []).map((r) => r.gmail_message_id));

  // Download new messages in parallel, capped per run so a request stays well
  // within the hosting time limit. Anything left is picked up on the next run.
  const newIds = ids.filter((id) => !existing.has(id)).slice(0, MAX_NEW_PER_RUN);
  const details = await Promise.all(
    newIds.map((id) =>
      gmail.users.messages
        .get({ userId: "me", id, format: "full" })
        .catch((err) => {
          console.error("gmail get failed", id, (err as Error).message);
          return null;
        })
    )
  );

  const rows = details
    .filter((d): d is NonNullable<typeof d> => !!d?.data.id)
    .map((detail) => toEmailRow(userId, detail.data));

  let saved = 0;
  if (rows.length) {
    const { error } = await supabaseAdmin
      .from("emails")
      .upsert(rows, { onConflict: "user_id,gmail_message_id" });
    if (error) throw new Error(`Saving emails failed: ${error.message}`);
    saved = rows.length;
  }

  return {
    fetched: messages.length,
    saved,
    remaining: Math.max(0, ids.length - existing.size - newIds.length),
  };
}

const MAX_NEW_PER_RUN = 15;

type GmailMessage = gmail_v1.Schema$Message;

function toEmailRow(userId: string, detail: GmailMessage) {
  const payload = detail.payload;
  const headers = payload?.headers || [];

  const from = extractHeader(headers, "From");
  const subject = extractHeader(headers, "Subject");
  const dateHeader = extractHeader(headers, "Date");

  const rawTextFromPlain = getPlainTextFromPayload(payload);
  const rawHtml = getHtmlFromPayload(payload);
  const rawText = rawTextFromPlain || (rawHtml ? stripHtml(rawHtml) : "");

  return {
    user_id: userId,
    gmail_message_id: detail.id!,
    thread_id: detail.threadId || null,
    from_email: from,
    subject,
    sent_at: dateHeader ? new Date(dateHeader).toISOString() : null,
    parsed_type: "other",
    raw_text: rawText,
    raw_html: rawHtml || null,
  };
}
