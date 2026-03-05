import { CreationProject, CreationProjectTransaction, ProjectStatistics, Project as RestProject } from "@clients";
import { Project as PrismaProject, ProjectTransaction as PrismaProjectTransaction } from "@prisma/client";

export const PROJECT_ACCOUNT_ID = "account-proj-123";
export const PROJECT_ID = "project-456";
export const PROJECT_TRANSACTION_ID = "proj-tx-789";

export const makePrismaProject = (overrides: Partial<PrismaProject> = {}): PrismaProject => ({
  id: PROJECT_ID,
  accountId: PROJECT_ACCOUNT_ID,
  name: "My Project",
  description: "A test project",
  initialBudget: 10000,
  color: "#3b82f6",
  iconRef: null,
  isArchived: false,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

export const makePrismaProjectTransaction = (overrides: Partial<PrismaProjectTransaction> = {}): PrismaProjectTransaction => ({
  id: PROJECT_TRANSACTION_ID,
  accountId: PROJECT_ACCOUNT_ID,
  projectId: PROJECT_ID,
  name: "Buy equipment",
  description: "Some equipment",
  estimatedCost: 500,
  realCost: 450,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

export const makeCreationProject = (overrides: Partial<CreationProject> = {}): CreationProject => ({
  name: "My Project",
  description: "A test project",
  initialBudget: 10000,
  color: "#3b82f6",
  ...overrides,
});

export const makeCreationProjectTransaction = (overrides: Partial<CreationProjectTransaction> = {}): CreationProjectTransaction => ({
  name: "Buy equipment",
  description: "Some equipment",
  estimatedCost: 500,
  realCost: 450,
  ...overrides,
});

export const makeProjectStatistics = (overrides: Partial<ProjectStatistics> = {}): ProjectStatistics => ({
  project: makePrismaProject() as any,
  totalEstimatedCost: 500,
  totalRealCost: 450,
  remainingBudget: 9550,
  transactionCount: 1,
  ...overrides,
});
