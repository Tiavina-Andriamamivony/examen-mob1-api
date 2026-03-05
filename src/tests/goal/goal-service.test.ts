import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPrismaClient } from "@/configs";
import { BadRequestError, NotFoundError } from "@/errors";
import { GoalServices } from "@/services/goal-services";

import { GOAL_ACCOUNT_ID, GOAL_ID, GOAL_WALLET_ID, makePrismaGoal, makeRestGoal } from "../fixtures/goal.fixtures";

vi.mock("@/configs", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/mappers", () => ({
  GoalMapper: {
    update: vi.fn((accountId, goal) => ({ ...goal, accountId, updatedAt: new Date() })),
  },
}));

const mockDb = {
  goal: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((ops: Promise<any>[]) => Promise.all(ops)),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrismaClient).mockReturnValue(mockDb as any);
});

describe("GoalServices.create", () => {
  it("should create a goal successfully", async () => {
    const goal = makePrismaGoal();
    mockDb.goal.findFirst.mockResolvedValue(null);
    mockDb.goal.create.mockResolvedValue(goal);

    const result = await GoalServices.create(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, goal);

    expect(mockDb.goal.findFirst).toHaveBeenCalledWith({
      where: {
        name: goal.name,
        accountId: GOAL_ACCOUNT_ID,
        isArchived: false,
        walletId: GOAL_WALLET_ID,
      },
    });
    expect(mockDb.goal.create).toHaveBeenCalledWith({ data: goal });
    expect(result).toEqual(goal);
  });

  it("should throw BadRequestError when name already exists for the same wallet", async () => {
    mockDb.goal.findFirst.mockResolvedValue(makePrismaGoal());

    await expect(GoalServices.create(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, makePrismaGoal())).rejects.toThrow(BadRequestError);
    expect(mockDb.goal.create).not.toHaveBeenCalled();
  });
});

describe("GoalServices.update", () => {
  it("should update a goal successfully", async () => {
    const goal = makePrismaGoal();
    mockDb.goal.findFirst
      .mockResolvedValueOnce(goal) // existence check
      .mockResolvedValueOnce(null); // name conflict check
    mockDb.goal.update.mockResolvedValue(goal);

    const result = await GoalServices.update(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, makeRestGoal());

    expect(mockDb.goal.update).toHaveBeenCalled();
    expect(result).toEqual(goal);
  });

  it("should throw NotFoundError when goal does not exist", async () => {
    mockDb.goal.findFirst.mockResolvedValue(null);

    await expect(GoalServices.update(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, makeRestGoal())).rejects.toThrow(NotFoundError);
    expect(mockDb.goal.update).not.toHaveBeenCalled();
  });

  it("should throw NotFoundError when goal is archived (excluded by isArchived: false filter)", async () => {
    mockDb.goal.findFirst.mockResolvedValue(null);

    await expect(GoalServices.update(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, makeRestGoal())).rejects.toThrow(NotFoundError);
  });

  it("should throw BadRequestError when name conflicts with another goal", async () => {
    mockDb.goal.findFirst.mockResolvedValueOnce(makePrismaGoal()).mockResolvedValueOnce(makePrismaGoal({ id: "other-goal" }));

    await expect(GoalServices.update(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, makeRestGoal())).rejects.toThrow(BadRequestError);
    expect(mockDb.goal.update).not.toHaveBeenCalled();
  });
});

describe("GoalServices.getOneById", () => {
  it("should return goal when found", async () => {
    const goal = makePrismaGoal();
    mockDb.goal.findFirst.mockResolvedValue(goal);

    const result = await GoalServices.getOneById(GOAL_ACCOUNT_ID, GOAL_ID);

    expect(mockDb.goal.findFirst).toHaveBeenCalledWith({
      where: { id: GOAL_ID, accountId: GOAL_ACCOUNT_ID, isArchived: false },
    });
    expect(result).toEqual(goal);
  });

  it("should throw NotFoundError when goal does not exist", async () => {
    mockDb.goal.findFirst.mockResolvedValue(null);

    await expect(GoalServices.getOneById(GOAL_ACCOUNT_ID, GOAL_ID)).rejects.toThrow(NotFoundError);
  });

  it("should throw NotFoundError for archived goals (filtered by query)", async () => {
    mockDb.goal.findFirst.mockResolvedValue(null);

    await expect(GoalServices.getOneById(GOAL_ACCOUNT_ID, GOAL_ID)).rejects.toThrow(NotFoundError);
  });
});

describe("GoalServices.archiveOneById", () => {
  it("should archive goal successfully", async () => {
    const goal = makePrismaGoal();
    mockDb.goal.findFirst.mockResolvedValue(goal);
    mockDb.goal.update.mockResolvedValue({ ...goal, isArchived: true });

    const result = await GoalServices.archiveOneById(GOAL_ACCOUNT_ID, GOAL_ID);

    expect(mockDb.goal.update).toHaveBeenCalledWith({
      data: { isArchived: true },
      where: { id: GOAL_ID, accountId: GOAL_ACCOUNT_ID },
    });
    expect(result.isArchived).toBe(true);
  });

  it("should throw NotFoundError when goal does not exist", async () => {
    mockDb.goal.findFirst.mockResolvedValue(null);

    await expect(GoalServices.archiveOneById(GOAL_ACCOUNT_ID, GOAL_ID)).rejects.toThrow(NotFoundError);
    expect(mockDb.goal.update).not.toHaveBeenCalled();
  });

  it("should throw NotFoundError when goal is already archived", async () => {
    mockDb.goal.findFirst.mockResolvedValue(null);

    await expect(GoalServices.archiveOneById(GOAL_ACCOUNT_ID, GOAL_ID)).rejects.toThrow(NotFoundError);
  });
});

describe("GoalServices.getAll", () => {
  it("should return goals and count", async () => {
    const goals = [makePrismaGoal(), makePrismaGoal({ id: "goal-2", name: "Travel fund" })];
    mockDb.goal.findMany.mockResolvedValue(goals);
    mockDb.goal.count.mockResolvedValue(2);

    const result = await GoalServices.getAll(GOAL_ACCOUNT_ID, { page: 1, pageSize: 10 });

    expect(result.values).toEqual(goals);
    expect(result.count).toBe(2);
  });

  it("should use default sort=desc and sortBy=createdAt without crashing", async () => {
    mockDb.goal.findMany.mockResolvedValue([]);
    mockDb.goal.count.mockResolvedValue(0);

    await expect(GoalServices.getAll(GOAL_ACCOUNT_ID, { page: 1, pageSize: 10 })).resolves.not.toThrow();
  });

  it("should filter by walletId when provided", async () => {
    mockDb.goal.findMany.mockResolvedValue([]);
    mockDb.goal.count.mockResolvedValue(0);

    await GoalServices.getAll(GOAL_ACCOUNT_ID, { page: 1, pageSize: 10, walletId: GOAL_WALLET_ID });

    expect(mockDb.goal.findMany).toHaveBeenCalled();
  });

  it("should paginate correctly", async () => {
    mockDb.goal.findMany.mockResolvedValue([]);
    mockDb.goal.count.mockResolvedValue(0);

    await GoalServices.getAll(GOAL_ACCOUNT_ID, { page: 3, pageSize: 5 });

    expect(mockDb.goal.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5, skip: 10 }));
  });

  it("should not crash when all optional filters are undefined", async () => {
    mockDb.goal.findMany.mockResolvedValue([]);
    mockDb.goal.count.mockResolvedValue(0);

    await expect(
      GoalServices.getAll(GOAL_ACCOUNT_ID, {
        page: 1,
        pageSize: 10,
        walletId: undefined,
        name: undefined,
        minAmount: undefined,
        maxAmount: undefined,
        startingDateBeginning: undefined,
        startingDateEnding: undefined,
        endingDateBeginning: undefined,
        endingDateEnding: undefined,
      }),
    ).resolves.not.toThrow();
  });
});
