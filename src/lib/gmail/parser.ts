type ParsedTransaction = {
  amount: number;
  currency: string;
  merchant_raw: string;
  merchant_normalized: string;
  direction: "debit" | "credit" | "refund";
  note: string;
  ownership_type: "mine" | "shared" | "not_mine" | "reimbursable";
  is_big_spend: boolean;
  is_emi: boolean;
  is_ignored: boolean;
  card_last4: string | null;
  card_label: string | null;
  supported_card_type_code: string | null;
  txn_date: string | null;
};

type EmailRow = {
  id: string;
  from_email: string | null;
  subject: string | null;
  raw_text: string | null;
  raw_html: string | null;
};

function getEmailText(email: EmailRow) {
  return [email.subject || "", email.raw_text || "", email.raw_html || ""]
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMerchant(name: string) {
  const cleaned = name.trim().replace(/\s+/g, " ");
  const upper = cleaned.toUpperCase();

  if (upper.includes("PYU*SWIGGY")) return "Swiggy";
  if (upper.includes("WWW SWIGGY IN")) return "Swiggy";
  if (upper.includes("SWIGGY")) return "Swiggy";

  if (upper.includes("ZOMATOLIMITED")) return "Zomato";
  if (upper.includes("ZOMATO")) return "Zomato";

  if (upper.includes("BHARTIAIRTELLTD")) return "Airtel";
  if (upper.includes("AIRTEL")) return "Airtel";

  if (upper.includes("AMAZON")) return "Amazon";
  if (upper.includes("FLIPKART")) return "Flipkart";
  if (upper.includes("UBER")) return "Uber";
  if (upper.startsWith("AGODA")) {
  const tail = upper.slice(5).replace(/[^A-Z0-9]/g, "");
  return tail ? `Agoda ${tail}` : "Agoda";
}

  return cleaned;
}

function toIsoFromHdfcFormat(datePart: string, timePart: string): string | null {
  // Example: 03 Apr, 2026 + 14:53:01
  const match = datePart.match(/^(\d{2})\s+([A-Za-z]{3}),\s+(\d{4})$/);
  if (!match) return null;

  const [, day, monthShort, year] = match;

  const monthMap: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };

  const month = monthMap[monthShort];
  if (!month) return null;

  // Storing as local-style timestamp without timezone conversion.
  // Postgres timestamptz will interpret it when inserted.
  return `${year}-${month}-${day}T${timePart}`;
}

function toIsoFromSbiFormat(datePart: string): string | null {
  // Example: 04/04/26
  const match = datePart.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;

  const [, day, month, yy] = match;
  const year = Number(yy) >= 70 ? `19${yy}` : `20${yy}`;

  return `${year}-${month}-${day}T00:00:00`;
}

function parseHdfcCreditCardDebit(email: EmailRow): ParsedTransaction | null {
  const from = (email.from_email || "").toLowerCase();
  const text = getEmailText(email);
  const upper = text.toUpperCase();

  if (!from.includes("alerts@hdfcbank.bank.in")) return null;
  if (!upper.includes("HDFC BANK CREDIT CARD")) return null;
  if (!upper.includes("IS DEBITED")) return null;
  if (!upper.includes("TOWARDS")) return null;

  const match = text.match(
    /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+is\s+debited\s+from\s+your\s+HDFC\s+Bank\s+Credit\s+Card\s+ending\s+(\d{4})\s+towards\s+(.+?)\s+on\s+(\d{2}\s+[A-Za-z]{3},\s+\d{4})\s+at\s+(\d{2}:\d{2}:\d{2})/i
  );

  if (!match) return null;

  const amount = Number(match[1].replace(/,/g, ""));
  const cardLast4 = match[2];
  const merchantRaw = match[3].trim();
  const datePart = match[4];
  const timePart = match[5];
  const txnDate = toIsoFromHdfcFormat(datePart, timePart);

  return {
    amount,
    currency: "INR",
    merchant_raw: merchantRaw,
    merchant_normalized: normalizeMerchant(merchantRaw),
    direction: "debit",
    note: "",
    ownership_type: "mine",
    is_big_spend: amount >= 5000,
    is_emi: false,
    is_ignored: false,
    card_last4: cardLast4,
    card_label: "HDFC Swiggy",
    supported_card_type_code: "hdfc_swiggy",
    txn_date: txnDate,
  };
}

function parseSbiCashbackDebit(email: EmailRow): ParsedTransaction | null {
  const from = (email.from_email || "").toLowerCase();
  const text = getEmailText(email);
  const upper = text.toUpperCase();

  if (!from.includes("onlinesbicard@sbicard.com")) return null;
  if (!upper.includes("SBI CREDIT CARD")) return null;
  if (!upper.includes("SPENT ON YOUR SBI CREDIT CARD")) return null;
  if (!upper.includes(" AT ")) return null;

  const match = text.match(
    /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+spent\s+on\s+your\s+SBI\s+Credit\s+Card\s+ending\s+(\d{4})\s+at\s+(.+?)\s+on\s+(\d{2}\/\d{2}\/\d{2})/i
  );

  if (!match) return null;

  const amount = Number(match[1].replace(/,/g, ""));
  const cardLast4 = match[2];
  const merchantRaw = match[3].trim();
  const datePart = match[4];
  const txnDate = toIsoFromSbiFormat(datePart);

  return {
    amount,
    currency: "INR",
    merchant_raw: merchantRaw,
    merchant_normalized: normalizeMerchant(merchantRaw),
    direction: "debit",
    note: "",
    ownership_type: "mine",
    is_big_spend: amount >= 5000,
    is_emi: false,
    is_ignored: false,
    card_last4: cardLast4,
    card_label: "SBI Cashback",
    supported_card_type_code: "sbi_cashback",
    txn_date: txnDate,
  };
}

export function parseBankTransactionEmail(
  email: EmailRow
): ParsedTransaction | null {
  return parseHdfcCreditCardDebit(email) || parseSbiCashbackDebit(email) || null;
}