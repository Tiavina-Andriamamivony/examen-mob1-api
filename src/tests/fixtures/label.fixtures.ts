import { CreationLabel, Label as RestLabel } from "@clients";
import { Label as PrismaLabel } from "@prisma/client";

export const LABEL_ACCOUNT_ID = "account-label-123";
export const LABEL_ID = "label-456";

export const makePrismaLabel = (overrides: Partial<PrismaLabel> = {}): PrismaLabel => ({
  id: LABEL_ID,
  accountId: LABEL_ACCOUNT_ID,
  name: "Food",
  color: "#3b82f6",
  iconRef: "⚒️",
  isArchived: false,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

export const makeCreationLabel = (overrides: Partial<CreationLabel> = {}): CreationLabel => ({
  name: "Food",
  color: "#3b82f6",
  iconRef: "⚒️",
  ...overrides,
});

export const makeRestLabel = (overrides: Partial<RestLabel> = {}): RestLabel => ({
  id: LABEL_ID,
  name: "Food",
  color: "#3b82f6",
  ...overrides,
});
