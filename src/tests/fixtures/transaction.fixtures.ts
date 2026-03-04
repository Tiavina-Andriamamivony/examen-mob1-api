import { CreationTransaction, Transaction as RestTransaction } from "@clients";
import { Label as PrismaLabel, Transaction as PrismaTransaction } from "@prisma/client";

import { makePrismaLabel } from "./label.fixtures";

export const TRANSACTION_ACCOUNT_ID = "account-tx-123";
export const TRANSACTION_WALLET_ID = "wallet-tx-456";
export const TRANSACTION_ID = "transaction-789";

export type PrismaTransactionWithLabels = PrismaTransaction & { labels: PrismaLabel[] };

export const makePrismaTransaction = (overrides: Partial<PrismaTransactionWithLabels> = {}): PrismaTransactionWithLabels => ({
  id: TRANSACTION_ID,
  accountId: TRANSACTION_ACCOUNT_ID,
  walletId: TRANSACTION_WALLET_ID,
  amount: 100,
  date: new Date("2024-01-01"),
  type: "IN",
  description: "Test transaction",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  labels: [makePrismaLabel()],
  ...overrides,
});

export const makeCreationTransaction = (overrides: Partial<CreationTransaction> = {}): CreationTransaction => ({
  date: new Date("2020-01-01"),
  type: "IN",
  amount: 100,
  description: "Test transaction",
  labels: [{ id: "label-456" }],
  ...overrides,
});

export const makeRestTransaction = (overrides: Partial<RestTransaction> = {}): RestTransaction => ({
  id: TRANSACTION_ID,
  accountId: TRANSACTION_ACCOUNT_ID,
  walletId: TRANSACTION_WALLET_ID,
  amount: 100,
  date: new Date("2020-01-01"),
  type: "IN",
  description: "Test transaction",
  labels: [{ id: "label-456" }],
  ...overrides,
});
