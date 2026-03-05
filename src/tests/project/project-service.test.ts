import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPrismaClient } from "@/configs";
import { NotFoundError } from "@/errors";
import { ProjectServices } from "@/services/project-services";

import {
  PROJECT_ACCOUNT_ID,
  PROJECT_ID,
  PROJECT_TRANSACTION_ID,
  makeCreationProject,
  makeCreationProjectTransaction,
  makePrismaProject,
  makePrismaProjectTransaction,
} from "../fixtures/project.fixtures";

vi.mock("@/configs", () => ({ getPrismaClient: vi.fn() }));

const mockDb = {
  project: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  projectTransaction: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getPrismaClient).mockReturnValue(mockDb as any);
});

describe("ProjectServices", () => {
  describe("create", () => {
    it("should create a project successfully", async () => {
      const project = makePrismaProject();
      mockDb.project.create.mockResolvedValue(project);

      const result = await ProjectServices.create(PROJECT_ACCOUNT_ID, makeCreationProject());

      expect(mockDb.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ accountId: PROJECT_ACCOUNT_ID, name: "My Project" }),
        }),
      );
      expect(result).toEqual(project);
    });
  });

  describe("getOneById", () => {
    it("should return project when found", async () => {
      const project = makePrismaProject();
      mockDb.project.findFirst.mockResolvedValue(project);

      const result = await ProjectServices.getOneById(PROJECT_ACCOUNT_ID, PROJECT_ID);

      expect(mockDb.project.findFirst).toHaveBeenCalledWith({
        where: { id: PROJECT_ID, accountId: PROJECT_ACCOUNT_ID, isArchived: false },
      });
      expect(result).toEqual(project);
    });

    it("should throw NotFoundError when project does not exist", async () => {
      mockDb.project.findFirst.mockResolvedValue(null);

      await expect(ProjectServices.getOneById(PROJECT_ACCOUNT_ID, PROJECT_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe("update", () => {
    it("should update a project successfully", async () => {
      const project = makePrismaProject();
      mockDb.project.findFirst.mockResolvedValue(project);
      mockDb.project.update.mockResolvedValue({ ...project, name: "Updated" });

      const result = await ProjectServices.update(PROJECT_ACCOUNT_ID, PROJECT_ID, {
        name: "Updated",
      });

      expect(mockDb.project.update).toHaveBeenCalled();
      expect(result.name).toBe("Updated");
    });

    it("should throw NotFoundError when project does not exist", async () => {
      mockDb.project.findFirst.mockResolvedValue(null);

      await expect(ProjectServices.update(PROJECT_ACCOUNT_ID, PROJECT_ID, { name: "Updated" })).rejects.toThrow(NotFoundError);
      expect(mockDb.project.update).not.toHaveBeenCalled();
    });
  });

  describe("archiveOneById", () => {
    it("should archive project successfully", async () => {
      const project = makePrismaProject();
      mockDb.project.findFirst.mockResolvedValue(project);
      mockDb.project.update.mockResolvedValue({ ...project, isArchived: true });

      const result = await ProjectServices.archiveOneById(PROJECT_ACCOUNT_ID, PROJECT_ID);

      expect(mockDb.project.update).toHaveBeenCalledWith({
        where: { id: PROJECT_ID, accountId: PROJECT_ACCOUNT_ID },
        data: { isArchived: true },
      });
      expect(result.isArchived).toBe(true);
    });

    it("should throw NotFoundError when project does not exist", async () => {
      mockDb.project.findFirst.mockResolvedValue(null);

      await expect(ProjectServices.archiveOneById(PROJECT_ACCOUNT_ID, PROJECT_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteOneById", () => {
    it("should delete project successfully", async () => {
      const project = makePrismaProject();
      mockDb.project.findFirst.mockResolvedValue(project);
      mockDb.project.delete.mockResolvedValue(project);

      const result = await ProjectServices.deleteOneById(PROJECT_ACCOUNT_ID, PROJECT_ID);

      expect(mockDb.project.delete).toHaveBeenCalledWith({
        where: { id: PROJECT_ID, accountId: PROJECT_ACCOUNT_ID },
      });
      expect(result).toEqual(project);
    });

    it("should throw NotFoundError when project does not exist", async () => {
      mockDb.project.findFirst.mockResolvedValue(null);

      await expect(ProjectServices.deleteOneById(PROJECT_ACCOUNT_ID, PROJECT_ID)).rejects.toThrow(NotFoundError);
      expect(mockDb.project.delete).not.toHaveBeenCalled();
    });
  });

  describe("getAll", () => {
    it("should return projects and count", async () => {
      const projects = [makePrismaProject()];
      mockDb.$transaction.mockResolvedValue([projects, 1]);

      const result = await ProjectServices.getAll(PROJECT_ACCOUNT_ID, { page: 1, pageSize: 10 });

      expect(result.values).toEqual(projects);
      expect(result.count).toBe(1);
    });

    it("should paginate correctly", async () => {
      mockDb.$transaction.mockResolvedValue([[], 0]);

      await ProjectServices.getAll(PROJECT_ACCOUNT_ID, { page: 2, pageSize: 5 });

      expect(mockDb.$transaction).toHaveBeenCalled();
    });
  });

  describe("createTransaction", () => {
    it("should create a project transaction successfully", async () => {
      const project = makePrismaProject();
      const tx = makePrismaProjectTransaction();
      mockDb.project.findFirst.mockResolvedValue(project);
      mockDb.projectTransaction.create.mockResolvedValue(tx);

      const result = await ProjectServices.createTransaction(PROJECT_ACCOUNT_ID, PROJECT_ID, makeCreationProjectTransaction());

      expect(mockDb.projectTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ projectId: PROJECT_ID, accountId: PROJECT_ACCOUNT_ID }),
        }),
      );
      expect(result).toEqual(tx);
    });

    it("should throw NotFoundError when project does not exist", async () => {
      mockDb.project.findFirst.mockResolvedValue(null);

      await expect(ProjectServices.createTransaction(PROJECT_ACCOUNT_ID, PROJECT_ID, makeCreationProjectTransaction())).rejects.toThrow(NotFoundError);
      expect(mockDb.projectTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe("getTransactionById", () => {
    it("should return transaction when found", async () => {
      const tx = makePrismaProjectTransaction();
      mockDb.projectTransaction.findFirst.mockResolvedValue(tx);

      const result = await ProjectServices.getTransactionById(PROJECT_ACCOUNT_ID, PROJECT_ID, PROJECT_TRANSACTION_ID);

      expect(mockDb.projectTransaction.findFirst).toHaveBeenCalledWith({
        where: { id: PROJECT_TRANSACTION_ID, projectId: PROJECT_ID, accountId: PROJECT_ACCOUNT_ID },
      });
      expect(result).toEqual(tx);
    });

    it("should throw NotFoundError when transaction does not exist", async () => {
      mockDb.projectTransaction.findFirst.mockResolvedValue(null);

      await expect(ProjectServices.getTransactionById(PROJECT_ACCOUNT_ID, PROJECT_ID, PROJECT_TRANSACTION_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateTransaction", () => {
    it("should update transaction successfully", async () => {
      const tx = makePrismaProjectTransaction();
      mockDb.projectTransaction.findFirst.mockResolvedValue(tx);
      mockDb.projectTransaction.update.mockResolvedValue({ ...tx, name: "Updated" });

      const result = await ProjectServices.updateTransaction(PROJECT_ACCOUNT_ID, PROJECT_ID, PROJECT_TRANSACTION_ID, { name: "Updated" });

      expect(mockDb.projectTransaction.update).toHaveBeenCalled();
      expect(result.name).toBe("Updated");
    });

    it("should throw NotFoundError when transaction does not exist", async () => {
      mockDb.projectTransaction.findFirst.mockResolvedValue(null);

      await expect(ProjectServices.updateTransaction(PROJECT_ACCOUNT_ID, PROJECT_ID, PROJECT_TRANSACTION_ID, {})).rejects.toThrow(NotFoundError);
      expect(mockDb.projectTransaction.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteTransaction", () => {
    it("should delete transaction successfully", async () => {
      const tx = makePrismaProjectTransaction();
      mockDb.projectTransaction.findFirst.mockResolvedValue(tx);
      mockDb.projectTransaction.delete.mockResolvedValue(tx);

      const result = await ProjectServices.deleteTransaction(PROJECT_ACCOUNT_ID, PROJECT_ID, PROJECT_TRANSACTION_ID);

      expect(mockDb.projectTransaction.delete).toHaveBeenCalledWith({
        where: { id: PROJECT_TRANSACTION_ID },
      });
      expect(result).toEqual(tx);
    });

    it("should throw NotFoundError when transaction does not exist", async () => {
      mockDb.projectTransaction.findFirst.mockResolvedValue(null);

      await expect(ProjectServices.deleteTransaction(PROJECT_ACCOUNT_ID, PROJECT_ID, PROJECT_TRANSACTION_ID)).rejects.toThrow(NotFoundError);
      expect(mockDb.projectTransaction.delete).not.toHaveBeenCalled();
    });
  });

  describe("getStatistics", () => {
    it("should compute statistics correctly", async () => {
      const project = makePrismaProject({ initialBudget: 10000 });
      const transactions = [makePrismaProjectTransaction({ estimatedCost: 500, realCost: 300 }), makePrismaProjectTransaction({ id: "tx-2", estimatedCost: 200, realCost: 150 })];
      mockDb.project.findFirst.mockResolvedValue(project);
      mockDb.projectTransaction.findMany.mockResolvedValue(transactions);

      const result = await ProjectServices.getStatistics(PROJECT_ACCOUNT_ID, PROJECT_ID);

      expect(result.totalEstimatedCost).toBe(700);
      expect(result.totalRealCost).toBe(450);
      expect(result.remainingBudget).toBe(9550);
      expect(result.transactionCount).toBe(2);
    });

    it("should return zero stats when no transactions", async () => {
      mockDb.project.findFirst.mockResolvedValue(makePrismaProject({ initialBudget: 5000 }));
      mockDb.projectTransaction.findMany.mockResolvedValue([]);

      const result = await ProjectServices.getStatistics(PROJECT_ACCOUNT_ID, PROJECT_ID);

      expect(result.totalEstimatedCost).toBe(0);
      expect(result.totalRealCost).toBe(0);
      expect(result.remainingBudget).toBe(5000);
      expect(result.transactionCount).toBe(0);
    });
  });
});
