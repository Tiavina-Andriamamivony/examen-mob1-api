import { CreationGoal, Goal as RestGoal } from "@clients";
import { Goal as PrismaGoal } from "@prisma/client";

export const GOAL_ACCOUNT_ID = "account-goal-123";
export const GOAL_WALLET_ID = "wallet-goal-456";
export const GOAL_ID = "goal-789";

export const makePrismaGoal = (overrides: Partial<PrismaGoal> = {}): PrismaGoal => ({
  id: GOAL_ID,
  accountId: GOAL_ACCOUNT_ID,
  walletId: GOAL_WALLET_ID,
  name: "Save for car",
  amount: 5000,
  startingDate: new Date("2024-01-01"),
  endingDate: new Date("2024-12-31"),
  color: "#3b82f6",
  iconRef: null,
  isArchived: false,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

export const makeCreationGoal = (overrides: Partial<CreationGoal> = {}): CreationGoal => ({
  name: "Save for car",
  amount: 5000,
  walletId: GOAL_WALLET_ID,
  startingDate: new Date("2024-01-01"),
  endingDate: new Date("2024-12-31"),
  color: "#3b82f6",
  iconRef: undefined,
  ...overrides,
});

export const makeRestGoal = (overrides: Partial<RestGoal> = {}): RestGoal => ({
  id: GOAL_ID,
  accountId: GOAL_ACCOUNT_ID,
  walletId: GOAL_WALLET_ID,
  name: "Save for car",
  amount: 5000,
  startingDate: new Date("2024-01-01"),
  endingDate: new Date("2024-12-31"),
  color: "#3b82f6",
  iconRef: undefined,
  ...overrides,
});
