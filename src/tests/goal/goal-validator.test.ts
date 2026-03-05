import { beforeEach, describe, expect, it, vi } from "vitest";

import { BadRequestError, ForbiddenError, NotFoundError } from "@/errors";
import { WalletServices } from "@/services";
import { GoalValidator } from "@/validator/goal-validator";

import { GOAL_ACCOUNT_ID, GOAL_WALLET_ID, makeCreationGoal, makeRestGoal } from "../fixtures/goal.fixtures";

vi.mock("@/services", () => ({
  WalletServices: {
    getOneById: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(WalletServices.getOneById).mockResolvedValue({ id: GOAL_WALLET_ID } as any);
});

describe("GoalValidator.create", () => {
  it("should pass with valid data", async () => {
    await expect(GoalValidator.create(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, makeCreationGoal())).resolves.not.toThrow();
  });

  it("should throw NotFoundError when wallet does not exist", async () => {
    vi.mocked(WalletServices.getOneById).mockRejectedValue(new NotFoundError(`Wallet with id=${GOAL_WALLET_ID} not found`));
    await expect(GoalValidator.create(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, makeCreationGoal())).rejects.toThrow(NotFoundError);
  });

  it("should throw BadRequestError when name is empty", async () => {
    await expect(GoalValidator.create(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, makeCreationGoal({ name: "" }))).rejects.toThrow(BadRequestError);
  });

  it("should throw BadRequestError when amount is zero", async () => {
    await expect(GoalValidator.create(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, makeCreationGoal({ amount: 0 }))).rejects.toThrow(BadRequestError);
  });

  it("should throw BadRequestError when amount is negative", async () => {
    await expect(GoalValidator.create(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, makeCreationGoal({ amount: -100 }))).rejects.toThrow(BadRequestError);
  });

  it("should throw BadRequestError when startingDate is after endingDate", async () => {
    await expect(
      GoalValidator.create(
        GOAL_ACCOUNT_ID,
        GOAL_WALLET_ID,
        makeCreationGoal({
          startingDate: new Date("2024-12-31"),
          endingDate: new Date("2024-01-01"),
        }),
      ),
    ).rejects.toThrow(BadRequestError);
  });

  it("should pass when startingDate equals endingDate", async () => {
    await expect(
      GoalValidator.create(
        GOAL_ACCOUNT_ID,
        GOAL_WALLET_ID,
        makeCreationGoal({
          startingDate: new Date("2024-06-01"),
          endingDate: new Date("2024-06-01"),
        }),
      ),
    ).resolves.not.toThrow();
  });

  it("should pass when optional fields are missing", async () => {
    const { color, iconRef, ...minimal } = makeCreationGoal();
    await expect(GoalValidator.create(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, minimal)).resolves.not.toThrow();
  });
});

describe("GoalValidator.update", () => {
  it("should pass with valid data and matching accountId", () => {
    expect(() => GoalValidator.update(GOAL_ACCOUNT_ID, makeRestGoal({ accountId: GOAL_ACCOUNT_ID }))).not.toThrow();
  });

  it("should throw ForbiddenError when accountId does not match", () => {
    expect(() => GoalValidator.update("other-account", makeRestGoal({ accountId: GOAL_ACCOUNT_ID }))).toThrow(ForbiddenError);
  });

  it("should pass when accountId is undefined in body (set by server)", () => {
    expect(() => GoalValidator.update(GOAL_ACCOUNT_ID, makeRestGoal({ accountId: undefined }))).not.toThrow();
  });

  it("should throw BadRequestError when name is empty", () => {
    expect(() => GoalValidator.update(GOAL_ACCOUNT_ID, makeRestGoal({ name: "" }))).toThrow(BadRequestError);
  });

  it("should throw BadRequestError when amount is zero", () => {
    expect(() => GoalValidator.update(GOAL_ACCOUNT_ID, makeRestGoal({ amount: 0 }))).toThrow(BadRequestError);
  });

  it("should throw BadRequestError when startingDate is after endingDate", () => {
    expect(() =>
      GoalValidator.update(
        GOAL_ACCOUNT_ID,
        makeRestGoal({
          startingDate: new Date("2025-01-01"),
          endingDate: new Date("2024-01-01"),
        }),
      ),
    ).toThrow(BadRequestError);
  });
});

describe("GoalValidator.filters", () => {
  it("should pass with empty filters", () => {
    expect(() => GoalValidator.filters({})).not.toThrow();
  });

  it("should pass with valid sort and sortBy", () => {
    expect(() => GoalValidator.filters({ sort: "asc", sortBy: "amount" })).not.toThrow();
  });

  it("should throw BadRequestError for invalid sortBy", () => {
    expect(() => GoalValidator.filters({ sortBy: "INVALID" as any })).toThrow(BadRequestError);
  });

  it("should throw BadRequestError for invalid sort", () => {
    expect(() => GoalValidator.filters({ sort: "INVALID" as any })).toThrow(BadRequestError);
  });

  it("should pass with all valid sortBy values", () => {
    const validValues = ["startingDate", "endingDate", "amount", "createdAt"] as const;
    for (const sortBy of validValues) {
      expect(() => GoalValidator.filters({ sortBy })).not.toThrow();
    }
  });

  it("should throw BadRequestError when startingDateBeginning is after startingDateEnding", () => {
    expect(() =>
      GoalValidator.filters({
        startingDateBeginning: "2024-12-01",
        startingDateEnding: "2024-01-01",
      }),
    ).toThrow(BadRequestError);
  });

  it("should throw BadRequestError when endingDateBeginning is after endingDateEnding", () => {
    expect(() =>
      GoalValidator.filters({
        endingDateBeginning: "2024-12-01",
        endingDateEnding: "2024-01-01",
      }),
    ).toThrow(BadRequestError);
  });

  it("should throw BadRequestError when minAmount is greater than maxAmount", () => {
    expect(() => GoalValidator.filters({ minAmount: "1000", maxAmount: "500" })).toThrow(BadRequestError);
  });

  it("should throw BadRequestError for invalid minAmount", () => {
    expect(() => GoalValidator.filters({ minAmount: "not-a-number" })).toThrow(BadRequestError);
  });

  it("should pass when minAmount equals maxAmount", () => {
    expect(() => GoalValidator.filters({ minAmount: "500", maxAmount: "500" })).not.toThrow();
  });
});

it("should pass for sortBy='name' (cast to any — type definition needs updating)", () => {
  expect(() => GoalValidator.filters({ sortBy: "name" as any })).not.toThrow();
});
