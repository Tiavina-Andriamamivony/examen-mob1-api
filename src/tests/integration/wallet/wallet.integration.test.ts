import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { WalletServices } from "@/services/wallet-services";
import { BadRequestError, NotFoundError } from "@/errors";
import { v4 } from "uuid";
import { setupIntegrationTests, prisma as testPrisma } from "../setup";
import { createTestAccount, cleanDatabase } from "../helpers/db.helper";

setupIntegrationTests();

let prisma: PrismaClient;
let accountId: string;

beforeEach(async () => {
  prisma = testPrisma;
  const account = await createTestAccount(prisma);
  accountId = account.id;
});

afterEach(async () => {
  await cleanDatabase(prisma);
});

describe("WalletServices Integration", () => {
  describe("create", () => {
    it("should create a wallet in the database", async () => {
      const result = await WalletServices.create(accountId, {
        name: "Personal",
        type: "CASH",
        amount: 1000,
        color: "#3b82f6",
        description: "My personal wallet",
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Personal");
      expect(result.type).toBe("CASH");
      expect(result.amount).toBe(1000);
      expect(result.accountId).toBe(accountId);
      expect(result.isArchived).toBe(false);
      expect(result.isActive).toBe(true);

      const inDb = await prisma.wallet.findFirst({ where: { id: result.id } });
      expect(inDb).not.toBeNull();
      expect(inDb?.name).toBe("Personal");
    });

    it("should throw BadRequestError when name already exists for same account", async () => {
      await WalletServices.create(accountId, {
        name: "Personal",
        type: "CASH",
        amount: 1000,
      });

      await expect(
        WalletServices.create(accountId, {
          name: "Personal",
          type: "BANK",
          amount: 500,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it("should allow same wallet name for different accounts", async () => {
      const otherAccount = await createTestAccount(prisma);

      await WalletServices.create(accountId, { name: "Personal", type: "CASH", amount: 1000 });
      const result = await WalletServices.create(otherAccount.id, { name: "Personal", type: "CASH", amount: 500 });

      expect(result.accountId).toBe(otherAccount.id);
    });
  });

  describe("update", () => {
    it("should update a wallet in the database", async () => {
      const created = await WalletServices.create(accountId, {
        name: "Personal",
        type: "CASH",
        amount: 1000,
      });

      const result = await WalletServices.update(accountId, {
        id: created.id,
        accountId,
        name: "Personal Updated",
        type: "BANK",
        isActive: true,
        color: "#22c55e",
        amount: 1000,
     });

      expect(result.name).toBe("Personal Updated");
      expect(result.type).toBe("BANK");

      const inDb = await prisma.wallet.findFirst({ where: { id: created.id } });
      expect(inDb?.name).toBe("Personal Updated");
    });

    it("should throw NotFoundError when wallet does not exist", async () => {
      await expect(
        WalletServices.update(accountId, {
          id: v4(),
          accountId,
          name: "Ghost",
          type: "CASH",
          isActive: true,
          amount: 100,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw BadRequestError when name conflicts with another wallet", async () => {
      const first = await WalletServices.create(accountId, { name: "First", type: "CASH", amount: 100 });
      await WalletServices.create(accountId, { name: "Second", type: "CASH", amount: 200 });

      await expect(
        WalletServices.update(accountId, {
          id: first.id,
          accountId,
          name: "Second",
          type: "CASH",
          isActive: true,
          amount: 100,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it("should allow updating wallet to its own current name", async () => {
      const created = await WalletServices.create(accountId, { name: "Personal", type: "CASH", amount: 1000 });

      const result = await WalletServices.update(accountId, {
        id: created.id,
        accountId,
        name: "Personal",
        type: "BANK",
        isActive: false,
        amount: 1000,
      });

      expect(result.name).toBe("Personal");
      expect(result.type).toBe("BANK");
    });
  });

  describe("updateAutomaticIncome", () => {
    it("should set haveAutomaticIncome to true when type is MENSUAL", async () => {
      const created = await WalletServices.create(accountId, { name: "Personal", type: "CASH", amount: 1000 });

      const result = await WalletServices.updateAutomaticIncome(accountId, created.id, {
        type: "MENSUAL",
        amount: 500,
        paymentDay: 15,
      });

      expect(result.haveAutomaticIncome).toBe(true);
      expect(result.automaticIncomeAmount).toBe(500);
      expect(result.automaticIncomeDay).toBe(15);

      const inDb = await prisma.wallet.findFirst({ where: { id: created.id } });
      expect(inDb?.haveAutomaticIncome).toBe(true);
    });

    it("should set haveAutomaticIncome to false when type is NOT_SPECIFIED", async () => {
      const created = await WalletServices.create(accountId, { name: "Personal", type: "CASH", amount: 1000 });

      await WalletServices.updateAutomaticIncome(accountId, created.id, {
        type: "MENSUAL",
        amount: 500,
        paymentDay: 15,
      });

      const result = await WalletServices.updateAutomaticIncome(accountId, created.id, {
        type: "NOT_SPECIFIED",
        amount: 0,
        paymentDay: 1,
      });

      expect(result.haveAutomaticIncome).toBe(false);
    });

    it("should throw NotFoundError when wallet does not exist", async () => {
      await expect(
        WalletServices.updateAutomaticIncome(accountId, v4(), {
          type: "MENSUAL",
          amount: 500,
          paymentDay: 15,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("getOneById", () => {
    it("should return wallet when found", async () => {
      const created = await WalletServices.create(accountId, { name: "Personal", type: "CASH", amount: 1000 });

      const result = await WalletServices.getOneById(accountId, created.id);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe("Personal");
    });

    it("should throw NotFoundError when wallet does not exist", async () => {
      await expect(WalletServices.getOneById(accountId, v4()))
        .rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when wallet belongs to another account", async () => {
      const otherAccount = await createTestAccount(prisma);
      const created = await WalletServices.create(otherAccount.id, { name: "Personal", type: "CASH", amount: 1000 });

      await expect(WalletServices.getOneById(accountId, created.id))
        .rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when wallet is archived", async () => {
      const created = await WalletServices.create(accountId, { name: "Personal", type: "CASH", amount: 1000 });
      await WalletServices.archiveOneById(accountId, created.id);

      await expect(WalletServices.getOneById(accountId, created.id))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe("archiveOneById", () => {
    it("should set isArchived to true in the database", async () => {
      const created = await WalletServices.create(accountId, { name: "Personal", type: "CASH", amount: 1000 });

      const result = await WalletServices.archiveOneById(accountId, created.id);

      expect(result.isArchived).toBe(true);

      const inDb = await prisma.wallet.findFirst({ where: { id: created.id } });
      expect(inDb?.isArchived).toBe(true);
    });

    it("should throw NotFoundError when wallet does not exist", async () => {
      await expect(WalletServices.archiveOneById(accountId, v4()))
        .rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when wallet is already archived", async () => {
      const created = await WalletServices.create(accountId, { name: "Personal", type: "CASH", amount: 1000 });
      await WalletServices.archiveOneById(accountId, created.id);

      await expect(WalletServices.archiveOneById(accountId, created.id))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe("getAll", () => {
    it("should return all active wallets for the account", async () => {
      await WalletServices.create(accountId, { name: "First", type: "CASH", amount: 100 });
      await WalletServices.create(accountId, { name: "Second", type: "BANK", amount: 200 });

      const result = await WalletServices.getAll(accountId, { page: 1, pageSize: 10 });

      expect(result.count).toBe(2);
      expect(result.values).toHaveLength(2);
    });

    it("should not return archived wallets", async () => {
      const first = await WalletServices.create(accountId, { name: "First", type: "CASH", amount: 100 });
      await WalletServices.create(accountId, { name: "Second", type: "BANK", amount: 200 });
      await WalletServices.archiveOneById(accountId, first.id);

      const result = await WalletServices.getAll(accountId, { page: 1, pageSize: 10 });

      expect(result.count).toBe(1);
      expect(result.values[0].name).toBe("Second");
    });

    it("should not return wallets from other accounts", async () => {
      const otherAccount = await createTestAccount(prisma);
      await WalletServices.create(otherAccount.id, { name: "Other", type: "CASH", amount: 100 });
      await WalletServices.create(accountId, { name: "Mine", type: "CASH", amount: 200 });

      const result = await WalletServices.getAll(accountId, { page: 1, pageSize: 10 });

      expect(result.count).toBe(1);
      expect(result.values[0].name).toBe("Mine");
    });

    it("should filter by walletType", async () => {
      await WalletServices.create(accountId, { name: "Cash Wallet", type: "CASH", amount: 100 });
      await WalletServices.create(accountId, { name: "Bank Wallet", type: "BANK", amount: 200 });

      const result = await WalletServices.getAll(accountId, {
        page: 1,
        pageSize: 10,
        walletType: "CASH",
      });

      expect(result.count).toBe(1);
      expect(result.values[0].type).toBe("CASH");
    });

    it("should filter by name", async () => {
      await WalletServices.create(accountId, { name: "Personal", type: "CASH", amount: 100 });
      await WalletServices.create(accountId, { name: "Savings", type: "BANK", amount: 200 });

      const result = await WalletServices.getAll(accountId, {
        page: 1,
        pageSize: 10,
        name: "Pers",
      });

      expect(result.count).toBe(1);
      expect(result.values[0].name).toBe("Personal");
    });

    it("should paginate correctly", async () => {
      await WalletServices.create(accountId, { name: "First", type: "CASH", amount: 100 });
      await WalletServices.create(accountId, { name: "Second", type: "CASH", amount: 200 });
      await WalletServices.create(accountId, { name: "Third", type: "CASH", amount: 300 });

      const page1 = await WalletServices.getAll(accountId, { page: 1, pageSize: 2 });
      const page2 = await WalletServices.getAll(accountId, { page: 2, pageSize: 2 });

      expect(page1.values).toHaveLength(2);
      expect(page2.values).toHaveLength(1);
      expect(page1.count).toBe(3);
      expect(page2.count).toBe(3);
    });
  });
});