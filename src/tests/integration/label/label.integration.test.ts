import { PrismaClient } from "@prisma/client";
import { v4 } from "uuid";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BadRequestError, NotFoundError } from "@/errors";
import { LabelServices } from "@/services/label-services";

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

describe("LabelServices Integration", () => {
  describe("create", () => {
    it("should create a label in the database", async () => {
      const result = await LabelServices.create(accountId, {
        name: "Food",
        color: "#3b82f6",
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Food");
      expect(result.accountId).toBe(accountId);
      expect(result.isArchived).toBe(false);

      const inDb = await prisma.label.findFirst({ where: { id: result.id } });
      expect(inDb).not.toBeNull();
    });

    it("should throw BadRequestError when name already exists for same account", async () => {
      await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });

      await expect(LabelServices.create(accountId, { name: "Food", color: "#ff0000" })).rejects.toThrow(BadRequestError);
    });

    it("should allow same label name for different accounts", async () => {
      const otherAccount = await createTestAccount(prisma);

      await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });
      const result = await LabelServices.create(otherAccount.id, { name: "Food", color: "#3b82f6" });

      expect(result.accountId).toBe(otherAccount.id);
    });
  });

  describe("update", () => {
    it("should update a label in the database", async () => {
      const created = await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });

      const result = await LabelServices.update(accountId, {
        id: created.id,
        name: "Groceries",
        color: "#22c55e",
      });

      expect(result.name).toBe("Groceries");
      expect(result.color).toBe("#22c55e");

      const inDb = await prisma.label.findFirst({ where: { id: created.id } });
      expect(inDb?.name).toBe("Groceries");
    });

    it("should throw NotFoundError when label does not exist", async () => {
      await expect(LabelServices.update(accountId, { id: v4(), name: "Ghost", color: "#000000" })).rejects.toThrow(NotFoundError);
    });

    it("should throw BadRequestError when name conflicts with another label", async () => {
      const first = await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });
      await LabelServices.create(accountId, { name: "Transport", color: "#ff0000" });

      await expect(LabelServices.update(accountId, { id: first.id, name: "Transport", color: "#3b82f6" })).rejects.toThrow(BadRequestError);
    });

    it("should allow updating label to its own current name", async () => {
      const created = await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });

      const result = await LabelServices.update(accountId, {
        id: created.id,
        name: "Food",
        color: "#22c55e",
      });

      expect(result.name).toBe("Food");
      expect(result.color).toBe("#22c55e");
    });

    it("should throw NotFoundError when label is archived", async () => {
      const created = await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });
      await LabelServices.archiveOneById(accountId, created.id);

      await expect(LabelServices.update(accountId, { id: created.id, name: "Food Updated", color: "#000" })).rejects.toThrow(NotFoundError);
    });
  });

  describe("getOneById", () => {
    it("should return label when found", async () => {
      const created = await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });

      const result = await LabelServices.getOneById(accountId, created.id);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe("Food");
    });

    it("should throw NotFoundError when label does not exist", async () => {
      await expect(LabelServices.getOneById(accountId, v4())).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when label belongs to another account", async () => {
      const otherAccount = await createTestAccount(prisma);
      const created = await LabelServices.create(otherAccount.id, { name: "Food", color: "#3b82f6" });

      await expect(LabelServices.getOneById(accountId, created.id)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when label is archived", async () => {
      const created = await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });
      await LabelServices.archiveOneById(accountId, created.id);

      await expect(LabelServices.getOneById(accountId, created.id)).rejects.toThrow(NotFoundError);
    });
  });

  describe("archiveOneById", () => {
    it("should set isArchived to true in the database", async () => {
      const created = await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });

      const result = await LabelServices.archiveOneById(accountId, created.id);

      expect(result.isArchived).toBe(true);

      const inDb = await prisma.label.findFirst({ where: { id: created.id } });
      expect(inDb?.isArchived).toBe(true);
    });

    it("should throw NotFoundError when label does not exist", async () => {
      await expect(LabelServices.archiveOneById(accountId, v4())).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when label is already archived", async () => {
      const created = await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });
      await LabelServices.archiveOneById(accountId, created.id);

      await expect(LabelServices.archiveOneById(accountId, created.id)).rejects.toThrow(NotFoundError);
    });
  });

  describe("getAll", () => {
    it("should return all active labels for the account", async () => {
      await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });
      await LabelServices.create(accountId, { name: "Transport", color: "#ff0000" });

      const result = await LabelServices.getAll(accountId, { page: 1, pageSize: 10 });

      expect(result.count).toBe(2);
      expect(result.values).toHaveLength(2);
    });

    it("should not return archived labels", async () => {
      const first = await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });
      await LabelServices.create(accountId, { name: "Transport", color: "#ff0000" });
      await LabelServices.archiveOneById(accountId, first.id);

      const result = await LabelServices.getAll(accountId, { page: 1, pageSize: 10 });

      expect(result.count).toBe(1);
      expect(result.values[0].name).toBe("Transport");
    });

    it("should not return labels from other accounts", async () => {
      const otherAccount = await createTestAccount(prisma);
      await LabelServices.create(otherAccount.id, { name: "Other", color: "#000000" });
      await LabelServices.create(accountId, { name: "Mine", color: "#3b82f6" });

      const result = await LabelServices.getAll(accountId, { page: 1, pageSize: 10 });

      expect(result.count).toBe(1);
      expect(result.values[0].name).toBe("Mine");
    });

    it("should filter by name", async () => {
      await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });
      await LabelServices.create(accountId, { name: "Transport", color: "#ff0000" });

      const result = await LabelServices.getAll(accountId, { page: 1, pageSize: 10, name: "Foo" });

      expect(result.count).toBe(1);
      expect(result.values[0].name).toBe("Food");
    });

    it("should paginate correctly", async () => {
      await LabelServices.create(accountId, { name: "Food", color: "#3b82f6" });
      await LabelServices.create(accountId, { name: "Transport", color: "#ff0000" });
      await LabelServices.create(accountId, { name: "Health", color: "#22c55e" });

      const page1 = await LabelServices.getAll(accountId, { page: 1, pageSize: 2 });
      const page2 = await LabelServices.getAll(accountId, { page: 2, pageSize: 2 });

      expect(page1.values).toHaveLength(2);
      expect(page2.values).toHaveLength(1);
      expect(page1.count).toBe(3);
    });
  });
});
