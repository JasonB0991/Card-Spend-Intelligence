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
  if (upper.includes("CLEARTRIP")) return "Cleartrip";
  if (upper.includes("URBANCLAP") || upper.includes("URBAN COMPANY")) return "Urban Company";
  if (upper.startsWith("AGODA")) {
    const tail = upper.slice(5).replace(/[^A-Z0-9]/g, "");
    return tail ? `Agoda ${tail}` : "Agoda";
  }

  return cleaned;
}

function toIsoFromHdfcFormat(datePart: string, timePart: string): string | null {
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

  return `${year}-${month}-${day}T${timePart}`;
}

function toIsoFromSbiFormat(datePart: string): string | null {
  const match = datePart.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;

  const [, day, month, yy] = match;
  const year = Number(yy) >= 70 ? `19${yy}` : `20${yy}`;

  return `${year}-${month}-${day}T00:00:00`;
}

function toIsoFromIciciFormat(datePart: string, timePart: string): string | null {
  const match = datePart.match(/^([A-Za-z]{3})\s+(\d{2}),\s+(\d{4})$/);
  if (!match) return null;

  const [, monthShort, day, year] = match;

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

  return `${year}-${month}-${day}T${timePart}`;
}

function toIsoFromYesFormat(datePart: string, timePart: string, ampm: string): string | null {
  const dateMatch = datePart.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!dateMatch) return null;

  const [, day, month, year] = dateMatch;
  const timeMatch = timePart.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!timeMatch) return null;

  let [, hh, mm, ss] = timeMatch;
  let hour = Number(hh);

  if (ampm.toLowerCase() === "pm" && hour !== 12) hour += 12;
  if (ampm.toLowerCase() === "am" && hour === 12) hour = 0;

  return `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:${mm}:${ss}`;
}

function toIsoFromIdfcFormat(datePart: string): string | null {
  const match = datePart.match(/^(\d{2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return null;

  const [, day, monthShort, year] = match;

  const monthMap: Record<string, string> = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
  };

  const month = monthMap[monthShort.toUpperCase()];
  if (!month) return null;

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
    card_label: "HDFC Credit Card",
    supported_card_type_code: null,
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

function parseIciciCreditCardDebit(email: EmailRow): ParsedTransaction | null {
  const from = (email.from_email || "").toLowerCase();
  const text = getEmailText(email);
  const upper = text.toUpperCase();

  if (!from.includes("credit_cards@icicibank.com")) return null;
  if (!upper.includes("ICICI BANK CREDIT CARD")) return null;
  if (!upper.includes("HAS BEEN USED FOR A TRANSACTION OF INR")) return null;
  if (!upper.includes("INFO:")) return null;

  const match = text.match(
    /Your\s+ICICI\s+Bank\s+Credit\s+Card\s+XX(\d{4})\s+has\s+been\s+used\s+for\s+a\s+transaction\s+of\s+INR\s+([\d,]+(?:\.\d{1,2})?)\s+on\s+([A-Za-z]{3}\s+\d{2},\s+\d{4})\s+at\s+(\d{2}:\d{2}:\d{2})\.\s+Info:\s+(.+?)\./i
  );

  if (!match) return null;

  const cardLast4 = match[1];
  const amount = Number(match[2].replace(/,/g, ""));
  const datePart = match[3];
  const timePart = match[4];
  const merchantRaw = match[5].trim();
  const txnDate = toIsoFromIciciFormat(datePart, timePart);

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
    card_label: "ICICI Credit Card",
    supported_card_type_code: "icici_credit_card",
    txn_date: txnDate,
  };
}

function parseYesBankCreditCardDebit(email: EmailRow): ParsedTransaction | null {
  const from = (email.from_email || "").toLowerCase();
  const text = getEmailText(email);
  const upper = text.toUpperCase();

  if (!from.includes("alerts@yes.bank.in")) return null;
  if (!upper.includes("YES BANK CREDIT CARD")) return null;
  if (!upper.includes("HAS BEEN SPENT ON YOUR YES BANK CREDIT CARD")) return null;

  const match = text.match(
    /INR\s+([\d,]+(?:\.\d{1,2})?)\s+has\s+been\s+spent\s+on\s+your\s+YES\s+BANK\s+Credit\s+Card\s+ending\s+with\s+(\d{4})\s+at\s+(.+?)\s+on\s+(\d{2}-\d{2}-\d{4})\s+at\s+(\d{2}:\d{2}:\d{2})\s+(am|pm)/i
  );

  if (!match) return null;

  const amount = Number(match[1].replace(/,/g, ""));
  const cardLast4 = match[2];
  const merchantRaw = match[3].trim();
  const datePart = match[4];
  const timePart = match[5];
  const ampm = match[6];
  const txnDate = toIsoFromYesFormat(datePart, timePart, ampm);

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
    card_label: "YES BANK Credit Card",
    supported_card_type_code: "yes_bank_credit_card",
    txn_date: txnDate,
  };
}

function parseIdfcFirstCreditCardDebit(email: EmailRow): ParsedTransaction | null {
  const from = (email.from_email || "").toLowerCase();
  const text = getEmailText(email);
  const upper = text.toUpperCase();

  if (!from.includes("noreply@idfcfirstbank.com")) return null;
  if (!upper.includes("IDFC FIRST BANK CREDIT CARD")) return null;
  if (!upper.includes("SPENT ON YOUR IDFC FIRST BANK CREDIT CARD")) return null;

  const match = text.match(
    /INR\s+([\d,]+(?:\.\d{1,2})?)\s+spent\s+on\s+your\s+IDFC\s+FIRST\s+BANK\s+Credit\s+Card\s+ending\s+XX(\d{4})\s+at\s+(.+?)\s+on\s+(\d{2}\s+[A-Za-z]{3}\s+\d{4})/i
  );

  if (!match) return null;

  const amount = Number(match[1].replace(/,/g, ""));
  const cardLast4 = match[2];
  const merchantRaw = match[3].trim();
  const datePart = match[4];
  const txnDate = toIsoFromIdfcFormat(datePart);

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
    card_label: "IDFC FIRST Credit Card",
    supported_card_type_code: "idfc_first_credit_card",
    txn_date: txnDate,
  };
}

export function parseBankTransactionEmail(
  email: EmailRow
): ParsedTransaction | null {
  return (
    parseHdfcCreditCardDebit(email) ||
    parseSbiCashbackDebit(email) ||
    parseIciciCreditCardDebit(email) ||
    parseYesBankCreditCardDebit(email) ||
    parseIdfcFirstCreditCardDebit(email) ||
    null
  );
}