import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoalController } from "@/controllers/goal-controllers";
import { BadRequestError, NotFoundError } from "@/errors";
import { GoalMapper } from "@/mappers";
import { GoalServices } from "@/services";
import { GoalValidator } from "@/validator";

import { GOAL_ACCOUNT_ID, GOAL_ID, GOAL_WALLET_ID, makeCreationGoal, makePrismaGoal } from "../fixtures/goal.fixtures";

vi.mock("@/services", () => ({
  GoalServices: {
    create: vi.fn(),
    update: vi.fn(),
    getOneById: vi.fn(),
    archiveOneById: vi.fn(),
    getAll: vi.fn(),
  },
}));

vi.mock("@/validator", () => ({
  GoalValidator: {
    create: vi.fn(),
    update: vi.fn(),
    filters: vi.fn(),
  },
}));

vi.mock("@/mappers", () => ({
  GoalMapper: {
    create: vi.fn(),
    update: vi.fn(),
    toRest: vi.fn((goal) => ({ ...goal, _mapped: true })),
    toListResponse: vi.fn((values, pagination) => ({ values, pagination })),
  },
}));

const makeReq = (overrides: Record<string, any> = {}) => ({
  account: { id: GOAL_ACCOUNT_ID },
  params: { goalId: GOAL_ID, walletId: GOAL_WALLET_ID },
  body: makeCreationGoal(),
  query: {},
  page: 1,
  pageSize: 10,
  ...overrides,
});

const makeRes = () => {
  const res: any = {};
  res.json = vi.fn().mockReturnValue(res);
  res.status = vi.fn().mockReturnValue(res);
  return res;
};

const invoke = async (handler: any, reqOverrides: Record<string, any> = {}) => {
  const req = makeReq(reqOverrides);
  const res = makeRes();
  const next = vi.fn();
  await handler(req, res, next);
  return { req, res, next };
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(GoalMapper.toRest).mockImplementation((goal) => ({ ...goal, _mapped: true }) as any);
  vi.mocked(GoalMapper.toListResponse).mockImplementation(
    (values, pagination) =>
      ({
        values,
        pagination,
      }) as any,
  );
  vi.mocked(GoalMapper.create).mockReturnValue(makePrismaGoal() as any);
  vi.mocked(GoalMapper.update).mockReturnValue(makePrismaGoal() as any);
});

describe("GoalController.create", () => {
  it("should validate, create, and return mapped goal", async () => {
    const prismaGoal = makePrismaGoal();
    vi.mocked(GoalValidator.create).mockResolvedValue(undefined);
    vi.mocked(GoalServices.create).mockResolvedValue(prismaGoal);

    const { res, next } = await invoke(GoalController.create);

    expect(GoalValidator.create).toHaveBeenCalledWith(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, expect.any(Object));
    expect(GoalServices.create).toHaveBeenCalledWith(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, expect.any(Object));
    expect(GoalMapper.toRest).toHaveBeenCalledWith(prismaGoal);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _mapped: true }));
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next with error when validator throws", async () => {
    vi.mocked(GoalValidator.create).mockRejectedValue(new BadRequestError("Name required"));

    const { next } = await invoke(GoalController.create);

    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    expect(GoalServices.create).not.toHaveBeenCalled();
  });

  it("should call next with error when service throws", async () => {
    vi.mocked(GoalValidator.create).mockResolvedValue(undefined);
    vi.mocked(GoalServices.create).mockRejectedValue(new BadRequestError("Name already exists"));

    const { next } = await invoke(GoalController.create);

    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });
});

describe("GoalController.update", () => {
  it("should validate, update, and return mapped goal", async () => {
    const prismaGoal = makePrismaGoal();
    vi.mocked(GoalValidator.update).mockReturnValue(undefined);
    vi.mocked(GoalServices.update).mockResolvedValue(prismaGoal);

    const { res, next } = await invoke(GoalController.update);

    expect(GoalValidator.update).toHaveBeenCalledWith(GOAL_ACCOUNT_ID, expect.any(Object));
    expect(GoalServices.update).toHaveBeenCalledWith(GOAL_ACCOUNT_ID, GOAL_WALLET_ID, expect.objectContaining({ id: GOAL_ID }));
    expect(GoalMapper.toRest).toHaveBeenCalledWith(prismaGoal);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next with NotFoundError when goal does not exist", async () => {
    vi.mocked(GoalValidator.update).mockReturnValue(undefined);
    vi.mocked(GoalServices.update).mockRejectedValue(new NotFoundError("Goal not found"));

    const { next } = await invoke(GoalController.update);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });
});

describe("GoalController.getOne", () => {
  it("should fetch and return mapped goal", async () => {
    const prismaGoal = makePrismaGoal();
    vi.mocked(GoalServices.getOneById).mockResolvedValue(prismaGoal);

    const { res, next } = await invoke(GoalController.getOne);

    expect(GoalServices.getOneById).toHaveBeenCalledWith(GOAL_ACCOUNT_ID, GOAL_ID);
    expect(GoalMapper.toRest).toHaveBeenCalledWith(prismaGoal);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next with NotFoundError when goal does not exist", async () => {
    vi.mocked(GoalServices.getOneById).mockRejectedValue(new NotFoundError("Goal not found"));

    const { next } = await invoke(GoalController.getOne);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });
});

describe("GoalController.archiveOne", () => {
  it("should archive and return mapped goal", async () => {
    const archived = makePrismaGoal({ isArchived: true });
    vi.mocked(GoalServices.archiveOneById).mockResolvedValue(archived);

    const { res, next } = await invoke(GoalController.archiveOne);

    expect(GoalServices.archiveOneById).toHaveBeenCalledWith(GOAL_ACCOUNT_ID, GOAL_ID);
    expect(GoalMapper.toRest).toHaveBeenCalledWith(archived);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next with NotFoundError when goal not found", async () => {
    vi.mocked(GoalServices.archiveOneById).mockRejectedValue(new NotFoundError("Goal not found"));

    const { next } = await invoke(GoalController.archiveOne);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });
});

describe("GoalController.getAll", () => {
  it("should validate filters, fetch all, and return list response", async () => {
    const goals = [makePrismaGoal()];
    vi.mocked(GoalValidator.filters).mockReturnValue(undefined);
    vi.mocked(GoalServices.getAll).mockResolvedValue({ values: goals, count: 1 });

    const { res, next } = await invoke(GoalController.getAll);

    expect(GoalValidator.filters).toHaveBeenCalled();
    expect(GoalServices.getAll).toHaveBeenCalledWith(GOAL_ACCOUNT_ID, expect.objectContaining({ page: 1, pageSize: 10 }));
    expect(GoalMapper.toListResponse).toHaveBeenCalledWith(goals, {
      page: 1,
      pageSize: 10,
      elementCount: 1,
    });
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next with BadRequestError when filters are invalid", async () => {
    vi.mocked(GoalValidator.filters).mockImplementation(() => {
      throw new BadRequestError("Invalid sortBy");
    });

    const { next } = await invoke(GoalController.getAll);

    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    expect(GoalServices.getAll).not.toHaveBeenCalled();
  });
});
