import type { NextFunction, Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WalletController } from "@/controllers/wallet-controllers";
import { BadRequestError, NotFoundError } from "@/errors";
import { WalletMapper } from "@/mappers";
import { WalletServices } from "@/services";
import { WalletValidator } from "@/validator";

import { ACCOUNT_ID, WALLET_ID, makeAutomaticIncome, makeCreationWallet, makePrismaWallet, makeUpdateWallet } from "../fixtures/wallet.fixtures";

vi.mock("@/services", () => ({
  WalletServices: {
    create: vi.fn(),
    update: vi.fn(),
    updateAutomaticIncome: vi.fn(),
    getOneById: vi.fn(),
    archiveOneById: vi.fn(),
    getAll: vi.fn(),
  },
}));

vi.mock("@/validator", () => ({
  WalletValidator: {
    create: vi.fn(),
    update: vi.fn(),
    updateAutomaticIncome: vi.fn(),
    getAll: vi.fn(),
  },
}));

vi.mock("@/mappers", () => ({
  WalletMapper: {
    toRest: vi.fn((w) => ({ ...w, mapped: true })),
    toListResponse: vi.fn((values, pagination) => ({ values, pagination })),
  },
}));

const makeReq = (overrides: Record<string, any> = {}): Request => {
  const base = {
    params: { walletId: WALLET_ID },
    query: {},
    body: {},
    account: { id: ACCOUNT_ID },
    page: 1,
    pageSize: 10,
  };
  return { ...base, ...overrides } as unknown as Request;
};

const makeRes = (): Response => {
  const res = {
    json: vi.fn(),
    status: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
};

const makeNext = (): NextFunction => vi.fn();

const callHandler = async (handler: RequestHandler, req: Request, res: Response, next?: NextFunction) => {
  const nextFn = next ?? makeNext();
  await (handler as any)(req, res, nextFn);
  return { req, res, next: nextFn };
};

beforeEach(() => vi.clearAllMocks());

describe("WalletController", () => {
  describe("create", () => {
    it("should create wallet and return mapped result", async () => {
      const wallet = makePrismaWallet();
      vi.mocked(WalletServices.create).mockResolvedValue(wallet);

      const req = makeReq({ body: makeCreationWallet() });
      const res = makeRes();
      const next = makeNext();

      await callHandler(WalletController.create, req, res, next);

      expect(WalletValidator.create).toHaveBeenCalledWith(req.body);
      expect(WalletServices.create).toHaveBeenCalledWith(ACCOUNT_ID, req.body);
      expect(WalletMapper.toRest).toHaveBeenCalledWith(wallet);
      expect(res.json).toHaveBeenCalledWith({ ...wallet, mapped: true });
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with error when service throws", async () => {
      const error = new BadRequestError("Name already exists");
      vi.mocked(WalletServices.create).mockRejectedValue(error);

      const { next } = await callHandler(WalletController.create, makeReq({ body: makeCreationWallet() }), makeRes());

      expect(next).toHaveBeenCalledWith(error);
    });

    it("should call next with error when validator throws", async () => {
      const error = new BadRequestError("Validation failed");
      vi.mocked(WalletValidator.create).mockImplementation(() => {
        throw error;
      });

      const { next } = await callHandler(WalletController.create, makeReq({ body: {} }), makeRes());

      expect(next).toHaveBeenCalledWith(error);
      expect(WalletServices.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update wallet and return mapped result", async () => {
      const wallet = makePrismaWallet();
      vi.mocked(WalletServices.update).mockResolvedValue(wallet);

      const req = makeReq({ body: makeUpdateWallet() });
      const res = makeRes();
      const next = makeNext();

      await callHandler(WalletController.update, req, res, next);

      expect(WalletValidator.update).toHaveBeenCalledWith(ACCOUNT_ID, req.body);
      expect(WalletServices.update).toHaveBeenCalledWith(ACCOUNT_ID, { ...req.body, id: WALLET_ID });
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with NotFoundError when wallet not found", async () => {
      const error = new NotFoundError("Wallet not found");
      vi.mocked(WalletServices.update).mockRejectedValue(error);

      const { next } = await callHandler(WalletController.update, makeReq({ body: makeUpdateWallet() }), makeRes());

      expect(next).toHaveBeenCalledWith(error);
    });

    it("should call next with error when validator throws ForbiddenError", async () => {
      const error = new BadRequestError("Forbidden");
      vi.mocked(WalletValidator.update).mockImplementation(() => {
        throw error;
      });

      const { next } = await callHandler(WalletController.update, makeReq({ body: makeUpdateWallet() }), makeRes());

      expect(next).toHaveBeenCalledWith(error);
      expect(WalletServices.update).not.toHaveBeenCalled();
    });
  });

  describe("updateAutomaticIncome", () => {
    it("should update automatic income and return mapped result", async () => {
      const wallet = makePrismaWallet();
      vi.mocked(WalletServices.updateAutomaticIncome).mockResolvedValue(wallet);

      const req = makeReq({ body: makeAutomaticIncome() });
      const res = makeRes();
      const next = makeNext();

      await callHandler(WalletController.updateAutomaticIncome, req, res, next);

      expect(WalletValidator.updateAutomaticIncome).toHaveBeenCalledWith(req.body);
      expect(WalletServices.updateAutomaticIncome).toHaveBeenCalledWith(ACCOUNT_ID, WALLET_ID, req.body);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with error when validator throws", async () => {
      const error = new BadRequestError("Invalid type");
      vi.mocked(WalletValidator.updateAutomaticIncome).mockImplementation(() => {
        throw error;
      });

      const { next } = await callHandler(WalletController.updateAutomaticIncome, makeReq({ body: {} }), makeRes());

      expect(next).toHaveBeenCalledWith(error);
      expect(WalletServices.updateAutomaticIncome).not.toHaveBeenCalled();
    });
  });

  describe("getOne", () => {
    it("should return mapped wallet", async () => {
      const wallet = makePrismaWallet();
      vi.mocked(WalletServices.getOneById).mockResolvedValue(wallet);

      const res = makeRes();
      const next = makeNext();

      await callHandler(WalletController.getOne, makeReq(), res, next);

      expect(WalletServices.getOneById).toHaveBeenCalledWith(ACCOUNT_ID, WALLET_ID);
      expect(WalletMapper.toRest).toHaveBeenCalledWith(wallet);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with NotFoundError when wallet does not exist", async () => {
      const error = new NotFoundError("Not found");
      vi.mocked(WalletServices.getOneById).mockRejectedValue(error);

      const { next } = await callHandler(WalletController.getOne, makeReq(), makeRes());

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("archiveOne", () => {
    it("should archive wallet and return mapped result", async () => {
      vi.mocked(WalletServices.archiveOneById).mockResolvedValue(makePrismaWallet({ isArchived: true }));

      const res = makeRes();
      const next = makeNext();

      await callHandler(WalletController.archiveOne, makeReq(), res, next);

      expect(WalletServices.archiveOneById).toHaveBeenCalledWith(ACCOUNT_ID, WALLET_ID);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with NotFoundError when wallet not found", async () => {
      const error = new NotFoundError("Not found");
      vi.mocked(WalletServices.archiveOneById).mockRejectedValue(error);

      const { next } = await callHandler(WalletController.archiveOne, makeReq(), makeRes());

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getAll", () => {
    it("should return list response with wallets", async () => {
      const wallets = [makePrismaWallet()];
      vi.mocked(WalletServices.getAll).mockResolvedValue({ values: wallets, count: 1 });

      const req = makeReq({ query: { walletType: "CASH" } });
      const res = makeRes();
      const next = makeNext();

      await callHandler(WalletController.getAll, req, res, next);

      expect(WalletValidator.getAll).toHaveBeenCalled();
      expect(WalletServices.getAll).toHaveBeenCalled();
      expect(WalletMapper.toListResponse).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with error when validator throws", async () => {
      const error = new BadRequestError("Invalid walletType");
      vi.mocked(WalletValidator.getAll).mockImplementation(() => {
        throw error;
      });

      const { next } = await callHandler(WalletController.getAll, makeReq(), makeRes());

      expect(next).toHaveBeenCalledWith(error);
      expect(WalletServices.getAll).not.toHaveBeenCalled();
    });

    it("should call next with error when service throws", async () => {
      vi.mocked(WalletValidator.getAll).mockImplementation(() => {}); // reset to no-op
      const error = new BadRequestError("DB error");
      vi.mocked(WalletServices.getAll).mockRejectedValue(error);

      const { next } = await callHandler(WalletController.getAll, makeReq(), makeRes());

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
