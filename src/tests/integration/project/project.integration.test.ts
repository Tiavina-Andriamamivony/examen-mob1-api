import { PrismaClient } from "@prisma/client";
import { v4 } from "uuid";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { NotFoundError } from "@/errors";
import { ProjectServices } from "@/services/project-services";

import { cleanDatabase, createTestAccount } from "../helpers/db.helper";
import { setupIntegrationTests, prisma as testPrisma } from "../setup";

setupIntegrationTests();

let prisma: PrismaClient;
let accountId: string;

beforeEach(async () => {
  prisma = testPrisma;
  await cleanDatabase(prisma);
  const account = await createTestAccount(prisma);
  accountId = account.id;
});

afterEach(async () => {
  await cleanDatabase(prisma);
});

const makeProject = (overrides = {}) => ({
  name: "My Project",
  description: "Test",
  initialBudget: 10000,
  color: "#3b82f6",
  ...overrides,
});

const makeProjectTransaction = (overrides = {}) => ({
  name: "Buy equipment",
  description: "Some equipment",
  estimatedCost: 500,
  realCost: 300,
  ...overrides,
});

describe("ProjectServices Integration", () => {
  describe("create", () => {
    it("should create a project in the database", async () => {
      const result = await ProjectServices.create(accountId, makeProject());

      expect(result.id).toBeDefined();
      expect(result.name).toBe("My Project");
      expect(result.accountId).toBe(accountId);
      expect(result.isArchived).toBe(false);

      const inDb = await prisma.project.findFirst({ where: { id: result.id } });
      expect(inDb).not.toBeNull();
    });

    it("should default color when not provided", async () => {
      const result = await ProjectServices.create(accountId, { name: "Test", initialBudget: 0 });
      expect(result.color).toBe("#00ff00");
    });
  });

  describe("getOneById", () => {
    it("should return project when found", async () => {
      const created = await ProjectServices.create(accountId, makeProject());
      const result = await ProjectServices.getOneById(accountId, created.id);
      expect(result.id).toBe(created.id);
    });

    it("should throw NotFoundError when project does not exist", async () => {
      await expect(ProjectServices.getOneById(accountId, v4())).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when project belongs to another account", async () => {
      const other = await createTestAccount(prisma);
      const created = await ProjectServices.create(other.id, makeProject());
      await expect(ProjectServices.getOneById(accountId, created.id)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when project is archived", async () => {
      const created = await ProjectServices.create(accountId, makeProject());
      await ProjectServices.archiveOneById(accountId, created.id);
      await expect(ProjectServices.getOneById(accountId, created.id)).rejects.toThrow(NotFoundError);
    });
  });

  describe("update", () => {
    it("should update a project in the database", async () => {
      const created = await ProjectServices.create(accountId, makeProject());
      const result = await ProjectServices.update(accountId, created.id, { name: "Updated" });

      expect(result.name).toBe("Updated");
      const inDb = await prisma.project.findFirst({ where: { id: created.id } });
      expect(inDb?.name).toBe("Updated");
    });

    it("should throw NotFoundError when project does not exist", async () => {
      await expect(ProjectServices.update(accountId, v4(), { name: "X" })).rejects.toThrow(NotFoundError);
    });
  });

  describe("archiveOneById", () => {
    it("should set isArchived to true", async () => {
      const created = await ProjectServices.create(accountId, makeProject());
      const result = await ProjectServices.archiveOneById(accountId, created.id);
      expect(result.isArchived).toBe(true);

      const inDb = await prisma.project.findFirst({ where: { id: created.id } });
      expect(inDb?.isArchived).toBe(true);
    });

    it("should throw NotFoundError when project does not exist", async () => {
      await expect(ProjectServices.archiveOneById(accountId, v4())).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteOneById", () => {
    it("should delete project from database", async () => {
      const created = await ProjectServices.create(accountId, makeProject());
      await ProjectServices.deleteOneById(accountId, created.id);

      const inDb = await prisma.project.findFirst({ where: { id: created.id } });
      expect(inDb).toBeNull();
    });

    it("should throw NotFoundError when project does not exist", async () => {
      await expect(ProjectServices.deleteOneById(accountId, v4())).rejects.toThrow(NotFoundError);
    });
  });

  describe("getAll", () => {
    it("should return all active projects for the account", async () => {
      await ProjectServices.create(accountId, makeProject({ name: "P1" }));
      await ProjectServices.create(accountId, makeProject({ name: "P2" }));

      const result = await ProjectServices.getAll(accountId, { page: 1, pageSize: 10 });

      expect(result.count).toBe(2);
      expect(result.values).toHaveLength(2);
    });

    it("should not return archived projects", async () => {
      const p1 = await ProjectServices.create(accountId, makeProject({ name: "Active" }));
      const p2 = await ProjectServices.create(accountId, makeProject({ name: "Archived" }));
      await ProjectServices.archiveOneById(accountId, p2.id);

      const result = await ProjectServices.getAll(accountId, { page: 1, pageSize: 10 });

      expect(result.count).toBe(1);
      expect(result.values[0].name).toBe("Active");
    });

    it("should not return projects from other accounts", async () => {
      const other = await createTestAccount(prisma);
      await ProjectServices.create(other.id, makeProject({ name: "Other" }));
      await ProjectServices.create(accountId, makeProject({ name: "Mine" }));

      const result = await ProjectServices.getAll(accountId, { page: 1, pageSize: 10 });

      expect(result.count).toBe(1);
      expect(result.values[0].name).toBe("Mine");
    });

    it("should filter by name", async () => {
      await ProjectServices.create(accountId, makeProject({ name: "Alpha" }));
      await ProjectServices.create(accountId, makeProject({ name: "Beta" }));

      const result = await ProjectServices.getAll(accountId, { page: 1, pageSize: 10, name: "Alp" });

      expect(result.count).toBe(1);
    });

    it("should paginate correctly", async () => {
      await ProjectServices.create(accountId, makeProject({ name: "P1" }));
      await ProjectServices.create(accountId, makeProject({ name: "P2" }));
      await ProjectServices.create(accountId, makeProject({ name: "P3" }));

      const page1 = await ProjectServices.getAll(accountId, { page: 1, pageSize: 2 });
      const page2 = await ProjectServices.getAll(accountId, { page: 2, pageSize: 2 });

      expect(page1.values).toHaveLength(2);
      expect(page2.values).toHaveLength(1);
      expect(page1.count).toBe(3);
    });
  });

  describe("project transactions", () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await ProjectServices.create(accountId, makeProject());
      projectId = project.id;
    });

    describe("createTransaction", () => {
      it("should create a transaction in the database", async () => {
        const result = await ProjectServices.createTransaction(accountId, projectId, makeProjectTransaction());

        expect(result.id).toBeDefined();
        expect(result.name).toBe("Buy equipment");
        expect(result.projectId).toBe(projectId);
        expect(result.accountId).toBe(accountId);
      });

      it("should throw NotFoundError when project does not exist", async () => {
        await expect(ProjectServices.createTransaction(accountId, v4(), makeProjectTransaction())).rejects.toThrow(NotFoundError);
      });
    });

    describe("getTransactionById", () => {
      it("should return transaction when found", async () => {
        const created = await ProjectServices.createTransaction(accountId, projectId, makeProjectTransaction());
        const result = await ProjectServices.getTransactionById(accountId, projectId, created.id);
        expect(result.id).toBe(created.id);
      });

      it("should throw NotFoundError when transaction does not exist", async () => {
        await expect(ProjectServices.getTransactionById(accountId, projectId, v4())).rejects.toThrow(NotFoundError);
      });
    });

    describe("updateTransaction", () => {
      it("should update a transaction in the database", async () => {
        const created = await ProjectServices.createTransaction(accountId, projectId, makeProjectTransaction());
        const result = await ProjectServices.updateTransaction(accountId, projectId, created.id, { name: "Updated", realCost: 600 });

        expect(result.name).toBe("Updated");
        expect(result.realCost).toBe(600);
      });

      it("should throw NotFoundError when transaction does not exist", async () => {
        await expect(ProjectServices.updateTransaction(accountId, projectId, v4(), { name: "X" })).rejects.toThrow(NotFoundError);
      });
    });

    describe("deleteTransaction", () => {
      it("should delete transaction from database", async () => {
        const created = await ProjectServices.createTransaction(accountId, projectId, makeProjectTransaction());
        await ProjectServices.deleteTransaction(accountId, projectId, created.id);

        const inDb = await prisma.projectTransaction.findFirst({ where: { id: created.id } });
        expect(inDb).toBeNull();
      });
    });

    describe("getTransactionsByProject", () => {
      it("should return all transactions for the project", async () => {
        await ProjectServices.createTransaction(accountId, projectId, makeProjectTransaction({ name: "T1" }));
        await ProjectServices.createTransaction(accountId, projectId, makeProjectTransaction({ name: "T2" }));

        const result = await ProjectServices.getTransactionsByProject(accountId, projectId);

        expect(result).toHaveLength(2);
      });

      it("should not return transactions from other projects", async () => {
        const p2 = await ProjectServices.create(accountId, makeProject({ name: "P2" }));
        await ProjectServices.createTransaction(accountId, p2.id, makeProjectTransaction({ name: "Other" }));
        await ProjectServices.createTransaction(accountId, projectId, makeProjectTransaction({ name: "Mine" }));

        const result = await ProjectServices.getTransactionsByProject(accountId, projectId);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Mine");
      });
    });

    describe("getStatistics", () => {
      it("should compute correct statistics", async () => {
        await ProjectServices.createTransaction(accountId, projectId, makeProjectTransaction({ estimatedCost: 500, realCost: 300 }));
        await ProjectServices.createTransaction(accountId, projectId, makeProjectTransaction({ estimatedCost: 200, realCost: 150 }));

        const result = await ProjectServices.getStatistics(accountId, projectId);

        expect(result.totalEstimatedCost).toBe(700);
        expect(result.totalRealCost).toBe(450);
        expect(result.remainingBudget).toBe(10000 - 450);
        expect(result.transactionCount).toBe(2);
      });

      it("should return zero stats when no transactions", async () => {
        const result = await ProjectServices.getStatistics(accountId, projectId);

        expect(result.totalEstimatedCost).toBe(0);
        expect(result.totalRealCost).toBe(0);
        expect(result.remainingBudget).toBe(10000);
        expect(result.transactionCount).toBe(0);
      });
    });
  });
});
