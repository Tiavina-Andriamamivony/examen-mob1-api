import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LabelController } from "@/controllers/label-controllers";
import { BadRequestError, NotFoundError } from "@/errors";
import { LabelMapper } from "@/mappers";
import { LabelServices } from "@/services";
import { LabelValidator } from "@/validator";

import { LABEL_ACCOUNT_ID, LABEL_ID, makeCreationLabel, makePrismaLabel, makeRestLabel } from "../fixtures/label.fixtures";

vi.mock("@/services");
vi.mock("@/validator");
vi.mock("@/mappers", () => ({
  LabelMapper: {
    toRest: vi.fn((l) => ({ ...l, mapped: true })),
    toListResponse: vi.fn((values, pagination) => ({ values, pagination })),
  },
}));

const makeReq = (overrides: Record<string, any> = {}): Request => {
  return {
    params: { labelId: LABEL_ID },
    query: {},
    body: {},
    account: { id: LABEL_ACCOUNT_ID },
    page: 1,
    pageSize: 10,
    ...overrides,
  } as unknown as Request;
};

const makeRes = (): Response => {
  const res = { json: vi.fn(), status: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
};

const makeNext = (): NextFunction => vi.fn();

const callHandler = async (handler: any, req: Request, res: Response, next?: NextFunction) => {
  const nextFn = next ?? makeNext();
  await handler(req, res, nextFn);
  return { req, res, next: nextFn };
};

beforeEach(() => vi.resetAllMocks());

describe("LabelController", () => {
  describe("create", () => {
    it("should create label and return mapped result", async () => {
      const label = makePrismaLabel();
      vi.mocked(LabelServices.create).mockResolvedValue(label);

      const req = makeReq({ body: makeCreationLabel() });
      const res = makeRes();
      const next = makeNext();

      await callHandler(LabelController.create, req, res, next);

      expect(LabelValidator.create).toHaveBeenCalledWith(req.body);
      expect(LabelServices.create).toHaveBeenCalledWith(LABEL_ACCOUNT_ID, req.body);
      expect(LabelMapper.toRest).toHaveBeenCalledWith(label);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with error when validator throws", async () => {
      const error = new BadRequestError("Name required");
      vi.mocked(LabelValidator.create).mockImplementation(() => {
        throw error;
      });

      const { next } = await callHandler(LabelController.create, makeReq({ body: {} }), makeRes());

      expect(next).toHaveBeenCalledWith(error);
      expect(LabelServices.create).not.toHaveBeenCalled();
    });

    it("should call next with error when service throws", async () => {
      const error = new BadRequestError("Name already exists");
      vi.mocked(LabelServices.create).mockRejectedValue(error);

      const { next } = await callHandler(LabelController.create, makeReq({ body: makeCreationLabel() }), makeRes());

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("update", () => {
    it("should update label and return mapped result", async () => {
      const label = makePrismaLabel();
      vi.mocked(LabelServices.update).mockResolvedValue(label);

      const req = makeReq({ body: makeRestLabel() });
      const res = makeRes();
      const next = makeNext();

      await callHandler(LabelController.update, req, res, next);

      expect(LabelValidator.update).toHaveBeenCalledWith(LABEL_ACCOUNT_ID, req.body);
      expect(LabelServices.update).toHaveBeenCalledWith(LABEL_ACCOUNT_ID, { ...req.body, id: LABEL_ID });
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with NotFoundError when label does not exist", async () => {
      const error = new NotFoundError("Label not found");
      vi.mocked(LabelServices.update).mockRejectedValue(error);

      const { next } = await callHandler(LabelController.update, makeReq({ body: makeRestLabel() }), makeRes());

      expect(next).toHaveBeenCalledWith(error);
    });

    it("should call next with error when validator throws", async () => {
      const error = new BadRequestError("Invalid");
      vi.mocked(LabelValidator.update).mockImplementation(() => {
        throw error;
      });

      const { next } = await callHandler(LabelController.update, makeReq({ body: makeRestLabel() }), makeRes());

      expect(next).toHaveBeenCalledWith(error);
      expect(LabelServices.update).not.toHaveBeenCalled();
    });
  });

  describe("getOne", () => {
    it("should return mapped label", async () => {
      const label = makePrismaLabel();
      vi.mocked(LabelServices.getOneById).mockResolvedValue(label);

      const res = makeRes();
      const next = makeNext();

      await callHandler(LabelController.getOne, makeReq(), res, next);

      expect(LabelServices.getOneById).toHaveBeenCalledWith(LABEL_ACCOUNT_ID, LABEL_ID);
      expect(LabelMapper.toRest).toHaveBeenCalledWith(label);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with NotFoundError when label does not exist", async () => {
      const error = new NotFoundError("Not found");
      vi.mocked(LabelServices.getOneById).mockRejectedValue(error);

      const { next } = await callHandler(LabelController.getOne, makeReq(), makeRes());

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("archiveOne", () => {
    it("should archive label and return mapped result", async () => {
      vi.mocked(LabelServices.archiveOneById).mockResolvedValue(makePrismaLabel({ isArchived: true }));

      const res = makeRes();
      const next = makeNext();

      await callHandler(LabelController.archiveOne, makeReq(), res, next);

      expect(LabelServices.archiveOneById).toHaveBeenCalledWith(LABEL_ACCOUNT_ID, LABEL_ID);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with NotFoundError when label not found", async () => {
      const error = new NotFoundError("Not found");
      vi.mocked(LabelServices.archiveOneById).mockRejectedValue(error);

      const { next } = await callHandler(LabelController.archiveOne, makeReq(), makeRes());

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getAll", () => {
    it("should return list response with labels", async () => {
      vi.mocked(LabelServices.getAll).mockResolvedValue({
        values: [makePrismaLabel()],
        count: 1,
      });

      const res = makeRes();
      const next = makeNext();

      await callHandler(LabelController.getAll, makeReq(), res, next);

      expect(LabelServices.getAll).toHaveBeenCalledWith(LABEL_ACCOUNT_ID, expect.objectContaining({ page: 1, pageSize: 10 }));
      expect(LabelMapper.toListResponse).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with error when service throws", async () => {
      const error = new BadRequestError("DB error");
      vi.mocked(LabelServices.getAll).mockRejectedValue(error);

      const { next } = await callHandler(LabelController.getAll, makeReq(), makeRes());

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
