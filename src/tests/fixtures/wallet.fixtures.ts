import { CreationWallet, UpdateWallet, WalletAutomaticIncome } from "@clients";
import { Wallet as PrismaWallet } from "@prisma/client";

export const ACCOUNT_ID = "account-123";
export const WALLET_ID = "wallet-456";

export const makePrismaWallet = (overrides: Partial<PrismaWallet> = {}): PrismaWallet => ({
  id: WALLET_ID,
  accountId: ACCOUNT_ID,
  name: "Personal",
  description: "My wallet",
  type: "CASH",
  amount: 1000,
  color: "#3b82f6",
  iconRef: "💰",
  isActive: true,
  isArchived: false,
  haveAutomaticIncome: false,
  automaticIncomeAmount: 0,
  automaticIncomeDay: 1,
  createdAt: new Date("2024-01-01"),
  ...overrides,
});

export const makeCreationWallet = (overrides: Partial<CreationWallet> = {}): CreationWallet => ({
  name: "Personal",
  description: "My wallet",
  type: "CASH",
  color: "#3b82f6",
  iconRef: "💰",
  amount: 1000,
  ...overrides,
});

export const makeUpdateWallet = (overrides: Partial<UpdateWallet> = {}): UpdateWallet => ({
  id: WALLET_ID,
  accountId: ACCOUNT_ID,
  name: "Personal Updated",
  description: "Updated",
  type: "BANK",
  isActive: true,
  color: "#22c55e",
  iconRef: "🏦",
  amount: 1000,
  ...overrides,
});

export const makeAutomaticIncome = (overrides: Partial<WalletAutomaticIncome> = {}): WalletAutomaticIncome => ({
  type: "MENSUAL",
  amount: 500,
  paymentDay: 15,
  ...overrides,
});
