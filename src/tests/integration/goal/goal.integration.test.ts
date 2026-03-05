import { PrismaClient } from "@prisma/client";
import { v4 } from "uuid";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BadRequestError, NotFoundError } from "@/errors";
import { GoalServices } from "@/services/goal-services";
import { WalletServices } from "@/services/wallet-services";

import { cleanDatabase, createTestAccount } from "../helpers/db.helper";
import { setupIntegrationTests, prisma as testPrisma } from "../setup";

setupIntegrationTests();

let prisma: PrismaClient;
let accountId: string;
let walletId: string;

beforeEach(async () => {
  prisma = testPrisma;
  await cleanDatabase(prisma);

  const account = await createTestAccount(prisma);
  accountId = account.id;

  const wallet = await WalletServices.create(accountId, {
    name: "Test Wallet",
    type: "CASH",
    amount: 1000,
    color: "#3b82f6",
  });
  walletId = wallet.id;
});

afterEach(async () => {
  await cleanDatabase(prisma);
});

const makeGoalData = (overrides: Record<string, any> = {}) => ({
  name: "Save for car",
  amount: 5000,
  walletId,
  startingDate: new Date("2024-01-01"),
  endingDate: new Date("2024-12-31"),
  color: "#3b82f6",
  ...overrides,
});

describe("GoalServices.create (integration)", () => {
  it("should create a goal in the database", async () => {
    const mapped = {
      id: v4(),
      accountId,
      walletId,
      name: "Save for car",
      amount: 5000,
      startingDate: new Date("2024-01-01"),
      endingDate: new Date("2024-12-31"),
      color: "#3b82f6",
      iconRef: null,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await GoalServices.create(accountId, walletId, mapped as any);

    expect(result.id).toBeDefined();
    expect(result.name).toBe("Save for car");
    expect(result.accountId).toBe(accountId);
    expect(result.isArchived).toBe(false);

    const inDb = await prisma.goal.findFirst({ where: { id: result.id } });
    expect(inDb).not.toBeNull();
  });

  it("should throw BadRequestError when name already exists for same wallet", async () => {
    const id1 = v4();
    const id2 = v4();
    const base = {
      accountId,
      walletId,
      name: "Save for car",
      amount: 5000,
      startingDate: new Date("2024-01-01"),
      endingDate: new Date("2024-12-31"),
      color: "#3b82f6",
      iconRef: null,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await GoalServices.create(accountId, walletId, { ...base, id: id1 } as any);

    await expect(GoalServices.create(accountId, walletId, { ...base, id: id2 } as any)).rejects.toThrow(BadRequestError);
  });

  it("should allow same name for different wallets", async () => {
    const wallet2 = await WalletServices.create(accountId, {
      name: "Second Wallet",
      type: "BANK",
      amount: 500,
      color: "#000000",
    });

    const base = {
      accountId,
      name: "Save for car",
      amount: 5000,
      startingDate: new Date("2024-01-01"),
      endingDate: new Date("2024-12-31"),
      color: "#3b82f6",
      iconRef: null,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const r1 = await GoalServices.create(accountId, walletId, {
      ...base,
      id: v4(),
      walletId,
    } as any);
    const r2 = await GoalServices.create(accountId, wallet2.id, {
      ...base,
      id: v4(),
      walletId: wallet2.id,
    } as any);

    expect(r1.walletId).toBe(walletId);
    expect(r2.walletId).toBe(wallet2.id);
  });
});

describe("GoalServices.update (integration)", () => {
  it("should update a goal in the database", async () => {
    const created = await prisma.goal.create({
      data: {
        id: v4(),
        accountId,
        walletId,
        name: "Save for car",
        amount: 5000,
        startingDate: new Date("2024-01-01"),
        endingDate: new Date("2024-12-31"),
        color: "#3b82f6",
      },
    });

    const result = await GoalServices.update(accountId, walletId, {
      id: created.id,
      accountId,
      walletId,
      name: "Buy a house",
      amount: 50000,
      startingDate: new Date("2024-01-01"),
      endingDate: new Date("2025-12-31"),
    });

    expect(result.name).toBe("Buy a house");
    expect(result.amount).toBe(50000);

    const inDb = await prisma.goal.findFirst({ where: { id: created.id } });
    expect(inDb?.name).toBe("Buy a house");
  });

  it("should throw NotFoundError when goal does not exist", async () => {
    await expect(
      GoalServices.update(accountId, walletId, {
        id: v4(),
        name: "Ghost",
        amount: 1000,
        startingDate: new Date("2024-01-01"),
        endingDate: new Date("2024-12-31"),
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("should throw BadRequestError when name conflicts with another goal", async () => {
    const goal1 = await prisma.goal.create({
      data: {
        id: v4(),
        accountId,
        walletId,
        name: "Save for car",
        amount: 5000,
        startingDate: new Date("2024-01-01"),
        endingDate: new Date("2024-12-31"),
        color: "#3b82f6",
      },
    });
    await prisma.goal.create({
      data: {
        id: v4(),
        accountId,
        walletId,
        name: "Save for house",
        amount: 10000,
        startingDate: new Date("2024-01-01"),
        endingDate: new Date("2024-12-31"),
        color: "#3b82f6",
      },
    });

    await expect(
      GoalServices.update(accountId, walletId, {
        id: goal1.id,
        accountId,
        walletId,
        name: "Save for house", // conflicts with goal2
        amount: 5000,
        startingDate: new Date("2024-01-01"),
        endingDate: new Date("2024-12-31"),
      }),
    ).rejects.toThrow(BadRequestError);
  });
});

describe("GoalServices.getOneById (integration)", () => {
  it("should return goal when found", async () => {
    const created = await prisma.goal.create({
      data: {
        id: v4(),
        accountId,
        walletId,
        name: "Save for car",
        amount: 5000,
        startingDate: new Date("2024-01-01"),
        endingDate: new Date("2024-12-31"),
        color: "#3b82f6",
      },
    });

    const result = await GoalServices.getOneById(accountId, created.id);

    expect(result.id).toBe(created.id);
    expect(result.name).toBe("Save for car");
  });

  it("should throw NotFoundError when goal does not exist", async () => {
    await expect(GoalServices.getOneById(accountId, v4())).rejects.toThrow(NotFoundError);
  });

  it("should throw NotFoundError when goal belongs to another account", async () => {
    const otherAccount = await createTestAccount(prisma);
    const created = await prisma.goal.create({
      data: {
        id: v4(),
        accountId: otherAccount.id,
        walletId,
        name: "Other account goal",
        amount: 100,
        startingDate: new Date("2024-01-01"),
        endingDate: new Date("2024-12-31"),
        color: "#000000",
      },
    });

    await expect(GoalServices.getOneById(accountId, created.id)).rejects.toThrow(NotFoundError);
  });

  it("should throw NotFoundError for archived goals", async () => {
    const created = await prisma.goal.create({
      data: {
        id: v4(),
        accountId,
        walletId,
        name: "Archived goal",
        amount: 100,
        startingDate: new Date("2024-01-01"),
        endingDate: new Date("2024-12-31"),
        color: "#3b82f6",
        isArchived: true,
      },
    });

    await expect(GoalServices.getOneById(accountId, created.id)).rejects.toThrow(NotFoundError);
  });
});

describe("GoalServices.archiveOneById (integration)", () => {
  it("should set isArchived to true", async () => {
    const created = await prisma.goal.create({
      data: {
        id: v4(),
        accountId,
        walletId,
        name: "Save for car",
        amount: 5000,
        startingDate: new Date("2024-01-01"),
        endingDate: new Date("2024-12-31"),
        color: "#3b82f6",
      },
    });

    const result = await GoalServices.archiveOneById(accountId, created.id);

    expect(result.isArchived).toBe(true);

    const inDb = await prisma.goal.findFirst({ where: { id: created.id } });
    expect(inDb?.isArchived).toBe(true);
  });

  it("should throw NotFoundError when goal does not exist", async () => {
    await expect(GoalServices.archiveOneById(accountId, v4())).rejects.toThrow(NotFoundError);
  });

  it("should throw NotFoundError when goal is already archived", async () => {
    const created = await prisma.goal.create({
      data: {
        id: v4(),
        accountId,
        walletId,
        name: "Save for car",
        amount: 5000,
        startingDate: new Date("2024-01-01"),
        endingDate: new Date("2024-12-31"),
        color: "#3b82f6",
        isArchived: true,
      },
    });

    await expect(GoalServices.archiveOneById(accountId, created.id)).rejects.toThrow(NotFoundError);
  });
});

describe("GoalServices.getAll (integration)", () => {
  const seedGoals = async () => {
    await prisma.goal.createMany({
      data: [
        {
          id: v4(),
          accountId,
          walletId,
          name: "Save for car",
          amount: 5000,
          startingDate: new Date("2024-01-01"),
          endingDate: new Date("2024-12-31"),
          color: "#3b82f6",
        },
        {
          id: v4(),
          accountId,
          walletId,
          name: "Buy a house",
          amount: 50000,
          startingDate: new Date("2024-06-01"),
          endingDate: new Date("2026-06-01"),
          color: "#22c55e",
        },
        {
          id: v4(),
          accountId,
          walletId,
          name: "Emergency fund",
          amount: 2000,
          startingDate: new Date("2024-01-01"),
          endingDate: new Date("2024-06-30"),
          color: "#ef4444",
          isArchived: true, // should be excluded
        },
      ],
    });
  };

  it("should return all active goals for the account", async () => {
    await seedGoals();

    const result = await GoalServices.getAll(accountId, { page: 1, pageSize: 10 });

    expect(result.count).toBe(2);
    expect(result.values).toHaveLength(2);
    expect(result.values.every((g) => !g.isArchived)).toBe(true);
  });

  it("should not return archived goals", async () => {
    await seedGoals();

    const result = await GoalServices.getAll(accountId, { page: 1, pageSize: 10 });

    expect(result.values.some((g) => g.name === "Emergency fund")).toBe(false);
  });

  it("should not return goals from other accounts", async () => {
    const otherAccount = await createTestAccount(prisma);
    await prisma.goal.create({
      data: {
        id: v4(),
        accountId: otherAccount.id,
        walletId,
        name: "Other account goal",
        amount: 100,
        startingDate: new Date("2024-01-01"),
        endingDate: new Date("2024-12-31"),
        color: "#000000",
      },
    });
    await seedGoals();

    const result = await GoalServices.getAll(accountId, { page: 1, pageSize: 10 });

    expect(result.values.every((g) => g.accountId === accountId)).toBe(true);
  });

  it("should filter by name", async () => {
    await seedGoals();

    const result = await GoalServices.getAll(accountId, { page: 1, pageSize: 10, name: "car" });

    expect(result.count).toBe(1);
    expect(result.values[0].name).toBe("Save for car");
  });

  it("should filter by walletId", async () => {
    const wallet2 = await WalletServices.create(accountId, {
      name: "Second Wallet",
      type: "BANK",
      amount: 0,
      color: "#000",
    });
    await prisma.goal.create({
      data: {
        id: v4(),
        accountId,
        walletId: wallet2.id,
        name: "Wallet 2 goal",
        amount: 100,
        startingDate: new Date("2024-01-01"),
        endingDate: new Date("2024-12-31"),
        color: "#3b82f6",
      },
    });
    await seedGoals();

    const result = await GoalServices.getAll(accountId, {
      page: 1,
      pageSize: 10,
      walletId: wallet2.id,
    });

    expect(result.count).toBe(1);
    expect(result.values[0].name).toBe("Wallet 2 goal");
  });

  it("should paginate correctly", async () => {
    await seedGoals();

    const page1 = await GoalServices.getAll(accountId, { page: 1, pageSize: 1 });
    const page2 = await GoalServices.getAll(accountId, { page: 2, pageSize: 1 });

    expect(page1.values).toHaveLength(1);
    expect(page2.values).toHaveLength(1);
    expect(page1.count).toBe(2);
    expect(page1.values[0].id).not.toBe(page2.values[0].id);
  });

  it("should filter by amount range", async () => {
    await seedGoals();

    const result = await GoalServices.getAll(accountId, {
      page: 1,
      pageSize: 10,
      minAmount: "1000",
      maxAmount: "10000",
    });

    expect(result.values.every((g) => g.amount >= 1000 && g.amount <= 10000)).toBe(true);
    expect(result.values.some((g) => g.name === "Save for car")).toBe(true);
    expect(result.values.some((g) => g.name === "Buy a house")).toBe(false);
  });
});
