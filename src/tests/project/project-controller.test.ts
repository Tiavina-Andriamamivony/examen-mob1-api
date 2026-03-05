import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectController } from "@/controllers/project-controllers";
import { BadRequestError, NotFoundError } from "@/errors";
import { ProjectMapper } from "@/mappers";
import { ProjectServices } from "@/services";
import { PdfGeneratorService } from "@/utilities/pdf-generator";
import { ProjectValidator } from "@/validator";

import {
  PROJECT_ACCOUNT_ID,
  PROJECT_ID,
  PROJECT_TRANSACTION_ID,
  makeCreationProject,
  makeCreationProjectTransaction,
  makePrismaProject,
  makePrismaProjectTransaction,
  makeProjectStatistics,
} from "../fixtures/project.fixtures";

vi.mock("@/services");
vi.mock("@/validator");
vi.mock("@/utilities/pdf-generator");
vi.mock("@/mappers", () => ({
  ProjectMapper: {
    toRest: vi.fn((p) => ({ ...p, mapped: true })),
    transactionToRest: vi.fn((t) => ({ ...t, mapped: true })),
    statisticsToRest: vi.fn((s) => ({ ...s, mapped: true })),
  },
}));

const makeReq = (overrides: Record<string, any> = {}): Request =>
  ({
    params: { projectId: PROJECT_ID, transactionId: PROJECT_TRANSACTION_ID },
    query: {},
    body: {},
    account: { id: PROJECT_ACCOUNT_ID },
    ...overrides,
  }) as unknown as Request;

const makeRes = (): Response => {
  const res = {
    json: vi.fn(),
    setHeader: vi.fn(),
    status: vi.fn(),
  };
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

describe("ProjectController", () => {
  describe("create", () => {
    it("should create project and return mapped result", async () => {
      const project = makePrismaProject();
      vi.mocked(ProjectServices.create).mockResolvedValue(project);

      const req = makeReq({ body: makeCreationProject() });
      const res = makeRes();
      const next = makeNext();

      await callHandler(ProjectController.create, req, res, next);

      expect(ProjectValidator.create).toHaveBeenCalledWith(req.body);
      expect(ProjectServices.create).toHaveBeenCalledWith(PROJECT_ACCOUNT_ID, req.body);
      expect(ProjectMapper.toRest).toHaveBeenCalledWith(project);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with error when validator throws", async () => {
      const error = new BadRequestError("Name required");
      vi.mocked(ProjectValidator.create).mockImplementation(() => {
        throw error;
      });

      const { next } = await callHandler(ProjectController.create, makeReq(), makeRes());

      expect(next).toHaveBeenCalledWith(error);
      expect(ProjectServices.create).not.toHaveBeenCalled();
    });

    it("should call next with error when service throws", async () => {
      const error = new BadRequestError("DB error");
      vi.mocked(ProjectServices.create).mockRejectedValue(error);

      const { next } = await callHandler(ProjectController.create, makeReq({ body: makeCreationProject() }), makeRes());

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("update", () => {
    it("should update project and return mapped result", async () => {
      const project = makePrismaProject();
      vi.mocked(ProjectServices.update).mockResolvedValue(project);

      const res = makeRes();
      const next = makeNext();

      await callHandler(ProjectController.update, makeReq({ body: makeCreationProject() }), res, next);

      expect(ProjectValidator.create).toHaveBeenCalled();
      expect(ProjectServices.update).toHaveBeenCalledWith(PROJECT_ACCOUNT_ID, PROJECT_ID, expect.anything());
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with NotFoundError when project not found", async () => {
      const error = new NotFoundError("Not found");
      vi.mocked(ProjectServices.update).mockRejectedValue(error);

      const { next } = await callHandler(ProjectController.update, makeReq({ body: makeCreationProject() }), makeRes());

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getOne", () => {
    it("should return mapped project", async () => {
      vi.mocked(ProjectServices.getOneById).mockResolvedValue(makePrismaProject());

      const res = makeRes();
      const next = makeNext();
      await callHandler(ProjectController.getOne, makeReq(), res, next);

      expect(ProjectServices.getOneById).toHaveBeenCalledWith(PROJECT_ACCOUNT_ID, PROJECT_ID);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with NotFoundError when project not found", async () => {
      vi.mocked(ProjectServices.getOneById).mockRejectedValue(new NotFoundError("Not found"));

      const { next } = await callHandler(ProjectController.getOne, makeReq(), makeRes());

      expect(next).toHaveBeenCalled();
    });
  });

  describe("archiveOne", () => {
    it("should archive project and return mapped result", async () => {
      vi.mocked(ProjectServices.archiveOneById).mockResolvedValue(makePrismaProject({ isArchived: true }));

      const res = makeRes();
      const next = makeNext();
      await callHandler(ProjectController.archiveOne, makeReq(), res, next);

      expect(ProjectServices.archiveOneById).toHaveBeenCalledWith(PROJECT_ACCOUNT_ID, PROJECT_ID);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete project and return mapped result", async () => {
      vi.mocked(ProjectServices.deleteOneById).mockResolvedValue(makePrismaProject());

      const res = makeRes();
      const next = makeNext();
      await callHandler(ProjectController.delete, makeReq(), res, next);

      expect(ProjectServices.deleteOneById).toHaveBeenCalledWith(PROJECT_ACCOUNT_ID, PROJECT_ID);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("createTransaction", () => {
    it("should create transaction and return mapped result", async () => {
      const tx = makePrismaProjectTransaction();
      vi.mocked(ProjectServices.createTransaction).mockResolvedValue(tx);

      const req = makeReq({ body: makeCreationProjectTransaction() });
      const res = makeRes();
      const next = makeNext();
      await callHandler(ProjectController.createTransaction, req, res, next);

      expect(ProjectValidator.createTransaction).toHaveBeenCalledWith(req.body);
      expect(ProjectServices.createTransaction).toHaveBeenCalledWith(PROJECT_ACCOUNT_ID, PROJECT_ID, req.body);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with error when validator throws", async () => {
      const error = new BadRequestError("Invalid");
      vi.mocked(ProjectValidator.createTransaction).mockImplementation(() => {
        throw error;
      });

      const { next } = await callHandler(ProjectController.createTransaction, makeReq(), makeRes());

      expect(next).toHaveBeenCalledWith(error);
      expect(ProjectServices.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe("updateTransaction", () => {
    it("should update transaction and return mapped result", async () => {
      const tx = makePrismaProjectTransaction();
      vi.mocked(ProjectServices.updateTransaction).mockResolvedValue(tx);

      const res = makeRes();
      const next = makeNext();
      await callHandler(ProjectController.updateTransaction, makeReq({ body: { name: "Updated" } }), res, next);

      expect(ProjectValidator.updateTransaction).toHaveBeenCalled();
      expect(ProjectServices.updateTransaction).toHaveBeenCalledWith(PROJECT_ACCOUNT_ID, PROJECT_ID, PROJECT_TRANSACTION_ID, expect.anything());
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("getTransaction", () => {
    it("should return mapped transaction", async () => {
      vi.mocked(ProjectServices.getTransactionById).mockResolvedValue(makePrismaProjectTransaction());

      const res = makeRes();
      const next = makeNext();
      await callHandler(ProjectController.getTransaction, makeReq(), res, next);

      expect(ProjectServices.getTransactionById).toHaveBeenCalledWith(PROJECT_ACCOUNT_ID, PROJECT_ID, PROJECT_TRANSACTION_ID);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("deleteTransaction", () => {
    it("should delete transaction and return mapped result", async () => {
      vi.mocked(ProjectServices.deleteTransaction).mockResolvedValue(makePrismaProjectTransaction());

      const res = makeRes();
      const next = makeNext();
      await callHandler(ProjectController.deleteTransaction, makeReq(), res, next);

      expect(ProjectServices.deleteTransaction).toHaveBeenCalledWith(PROJECT_ACCOUNT_ID, PROJECT_ID, PROJECT_TRANSACTION_ID);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("getStatistics", () => {
    it("should return mapped statistics", async () => {
      vi.mocked(ProjectServices.getStatistics).mockResolvedValue(makeProjectStatistics() as any);

      const res = makeRes();
      const next = makeNext();
      await callHandler(ProjectController.getStatistics, makeReq(), res, next);

      expect(ProjectServices.getStatistics).toHaveBeenCalledWith(PROJECT_ACCOUNT_ID, PROJECT_ID);
      expect(ProjectMapper.statisticsToRest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with NotFoundError when project not found", async () => {
      vi.mocked(ProjectServices.getStatistics).mockRejectedValue(new NotFoundError("Not found"));

      const { next } = await callHandler(ProjectController.getStatistics, makeReq(), makeRes());

      expect(next).toHaveBeenCalled();
    });
  });

  describe("generateStatisticsPDF", () => {
    it("should pipe PDF stream to response", async () => {
      const fakePdf = { pipe: vi.fn() };
      vi.mocked(ProjectServices.getStatistics).mockResolvedValue(makeProjectStatistics() as any);
      vi.mocked(PdfGeneratorService.generateProjectStatisticsPDF).mockReturnValue(fakePdf as any);

      const res = makeRes();
      const next = makeNext();
      await callHandler(ProjectController.generateStatisticsPDF, makeReq(), res, next);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(fakePdf.pipe).toHaveBeenCalledWith(res);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
