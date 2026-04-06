"use client";

import TransactionWorkbenchCard from "@/components/TransactionWorkbenchCard";

type Transaction = {
  id: string;
  amount: number;
  merchant_raw: string | null;
  merchant_normalized: string | null;
  direction: string | null;
  ownership_type: string | null;
  note: string | null;
  is_big_spend: boolean | null;
  is_emi: boolean | null;
  is_ignored: boolean | null;
  card_last4: string | null;
  card_label: string | null;
  card_id: string | null;
  txn_date: string | null;
  product_name: string | null;
  platform_code: string | null;
  review_status: string | null;
  review_note: string | null;
};

type Card = {
  id: string;
  nickname: string | null;
  card_last4: string;
  is_active: boolean;
  supported_card_types?: {
    bank_name: string;
    card_name: string;
    network: string | null;
  } | null;
};

type Split = {
  id: string;
  transaction_id: string;
  person_name: string;
  amount_owed: number;
  status: string;
  comment: string | null;
};

export default function TransactionsPageClient({
  transactions,
  cards,
  splits,
}: {
  transactions: Transaction[];
  cards: Card[];
  splits: Split[];
}) {
  const splitsByTransactionId = splits.reduce<Record<string, Split[]>>(
    (acc, split) => {
      if (!acc[split.transaction_id]) {
        acc[split.transaction_id] = [];
      }
      acc[split.transaction_id].push(split);
      return acc;
    },
    {},
  );

  return (
    <div className="h-full w-full min-w-0 flex-1 overflow-hidden bg-[#f8faf7]">
      <TransactionWorkbenchCard
        transactions={transactions}
        splitsByTransactionId={splitsByTransactionId}
      />
    </div>
  );
}