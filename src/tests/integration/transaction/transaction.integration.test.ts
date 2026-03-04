import { PrismaClient } from "@prisma/client";
import { v4 } from "uuid";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BadRequestError, NotFoundError } from "@/errors";
import { LabelServices } from "@/services/label-services";
import { TransactionServices } from "@/services/transaction-services";
import { WalletServices } from "@/services/wallet-services";

import { cleanDatabase, createTestAccount } from "../helpers/db.helper";
import { setupIntegrationTests, prisma as testPrisma } from "../setup";

setupIntegrationTests();

let prisma: PrismaClient;
let accountId: string;
let walletId: string;
let labelId: string;

const INITIAL_WALLET_AMOUNT = 1000;

beforeEach(async () => {
  prisma = testPrisma;
  await cleanDatabase(prisma);

  const account = await createTestAccount(prisma);
  accountId = account.id;

  const wallet = await WalletServices.create(accountId, {
    name: "Test Wallet",
    type: "CASH",
    amount: INITIAL_WALLET_AMOUNT,
    color: "#3b82f6",
  });
  walletId = wallet.id;

  const label = await LabelServices.create(accountId, {
    name: "Food",
    color: "#3b82f6",
  });
  labelId = label.id;
});

afterEach(async () => {
  await cleanDatabase(prisma);
});

const makeTransactionData = (overrides: Record<string, any> = {}) => ({
  id: v4(),
  accountId,
  walletId,
  amount: 100,
  date: new Date("2020-01-01"),
  type: "IN" as const,
  description: "Test",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("TransactionServices Integration", () => {
  describe("create", () => {
    it("should create a transaction in the database", async () => {
      const result = await TransactionServices.create(accountId, walletId, makeTransactionData() as any, [{ id: labelId }]);

      expect(result.id).toBeDefined();
      expect(result.amount).toBe(100);
      expect(result.type).toBe("IN");
      expect(result.accountId).toBe(accountId);
      expect(result.labels).toHaveLength(1);

      const inDb = await prisma.transaction.findFirst({ where: { id: result.id } });
      expect(inDb).not.toBeNull();
    });

    it("should increase wallet amount for IN transaction with past date", async () => {
      await TransactionServices.create(accountId, walletId, makeTransactionData({ amount: 200, type: "IN" }) as any, [{ id: labelId }]);

      const walletAfter = await WalletServices.getOneById(accountId, walletId);
      expect(walletAfter.amount).toBe(INITIAL_WALLET_AMOUNT + 200);
    });

    it("should decrease wallet amount for OUT transaction with past date", async () => {
      await TransactionServices.create(accountId, walletId, makeTransactionData({ amount: 200, type: "OUT" }) as any, [{ id: labelId }]);

      const walletAfter = await WalletServices.getOneById(accountId, walletId);
      expect(walletAfter.amount).toBe(INITIAL_WALLET_AMOUNT - 200);
    });

    it("should not update wallet for future transaction", async () => {
      await TransactionServices.create(accountId, walletId, makeTransactionData({ date: new Date("2099-01-01"), amount: 200 }) as any, [{ id: labelId }]);

      const walletAfter = await WalletServices.getOneById(accountId, walletId);
      expect(walletAfter.amount).toBe(INITIAL_WALLET_AMOUNT);
    });

    it("should throw BadRequestError when label does not exist", async () => {
      await expect(TransactionServices.create(accountId, walletId, makeTransactionData() as any, [{ id: v4() }])).rejects.toThrow(BadRequestError);
    });
  });

  describe("update", () => {
    it("should update a transaction in the database", async () => {
      const created = await TransactionServices.create(accountId, walletId, makeTransactionData() as any, [{ id: labelId }]);

      const result = await TransactionServices.update(accountId, walletId, created.id, { ...makeTransactionData(), id: created.id, amount: 200 } as any, [{ id: labelId }]);

      expect(result.amount).toBe(200);

      const inDb = await prisma.transaction.findFirst({ where: { id: created.id } });
      expect(inDb?.amount).toBe(200);
    });

    it("should correctly adjust wallet when amount changes", async () => {
      // Create IN 100 → wallet goes from 1000 to 1100
      const created = await TransactionServices.create(accountId, walletId, makeTransactionData({ amount: 100, type: "IN" }) as any, [{ id: labelId }]);

      // Update to IN 300 → should reverse 100 then apply 300 → 1000 - 100 + 300 = 1200
      await TransactionServices.update(accountId, walletId, created.id, { ...makeTransactionData(), id: created.id, amount: 300, type: "IN" } as any, [{ id: labelId }]);

      const walletAfter = await WalletServices.getOneById(accountId, walletId);
      expect(walletAfter.amount).toBe(INITIAL_WALLET_AMOUNT + 300);
    });

    it("should throw NotFoundError when transaction does not exist", async () => {
      await expect(TransactionServices.update(accountId, walletId, v4(), makeTransactionData() as any, [{ id: labelId }])).rejects.toThrow(NotFoundError);
    });
  });

  describe("getOneById", () => {
    it("should return transaction when found", async () => {
      const created = await TransactionServices.create(accountId, walletId, makeTransactionData() as any, [{ id: labelId }]);

      const result = await TransactionServices.getOneById(accountId, walletId, created.id);

      expect(result.id).toBe(created.id);
      expect(result.labels).toHaveLength(1);
    });

    it("should throw NotFoundError when transaction does not exist", async () => {
      await expect(TransactionServices.getOneById(accountId, walletId, v4())).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when transaction belongs to another account", async () => {
      const otherAccount = await createTestAccount(prisma);
      const otherWallet = await WalletServices.create(otherAccount.id, {
        name: "Other Wallet",
        type: "CASH",
        amount: 500,
        color: "#000000",
      });
      const otherLabel = await LabelServices.create(otherAccount.id, {
        name: "Other Label",
        color: "#000000",
      });
      const created = await TransactionServices.create(otherAccount.id, otherWallet.id, { ...makeTransactionData(), accountId: otherAccount.id, walletId: otherWallet.id } as any, [
        { id: otherLabel.id },
      ]);

      await expect(TransactionServices.getOneById(accountId, walletId, created.id)).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteOneById", () => {
    it("should delete transaction and reverse wallet amount for IN", async () => {
      // Create IN 100 → wallet: 1000 → 1100
      const created = await TransactionServices.create(accountId, walletId, makeTransactionData({ amount: 100, type: "IN" }) as any, [{ id: labelId }]);

      // Delete → should reverse: 1100 → 1000
      await TransactionServices.deleteOneById(accountId, walletId, created.id);

      const walletAfter = await WalletServices.getOneById(accountId, walletId);
      expect(walletAfter.amount).toBe(INITIAL_WALLET_AMOUNT);

      const inDb = await prisma.transaction.findFirst({ where: { id: created.id } });
      expect(inDb).toBeNull();
    });

    it("should delete transaction and reverse wallet amount for OUT", async () => {
      // Create OUT 100 → wallet: 1000 → 900
      const created = await TransactionServices.create(accountId, walletId, makeTransactionData({ amount: 100, type: "OUT" }) as any, [{ id: labelId }]);

      // Delete → should reverse: 900 → 1000
      await TransactionServices.deleteOneById(accountId, walletId, created.id);

      const walletAfter = await WalletServices.getOneById(accountId, walletId);
      expect(walletAfter.amount).toBe(INITIAL_WALLET_AMOUNT);
    });

    it("should throw NotFoundError when transaction does not exist", async () => {
      await expect(TransactionServices.deleteOneById(accountId, walletId, v4())).rejects.toThrow(NotFoundError);
    });
  });

  describe("getAll", () => {
    it("should return all transactions for the account", async () => {
      await TransactionServices.create(accountId, walletId, makeTransactionData() as any, [{ id: labelId }]);
      await TransactionServices.create(accountId, walletId, makeTransactionData() as any, [{ id: labelId }]);

      const result = await TransactionServices.getAll(accountId, { page: 1, pageSize: 10 });

      expect(result.count).toBe(2);
      expect(result.values).toHaveLength(2);
    });

    it("should not return transactions from other accounts", async () => {
      const otherAccount = await createTestAccount(prisma);
      const otherWallet = await WalletServices.create(otherAccount.id, {
        name: "Other",
        type: "CASH",
        amount: 500,
        color: "#000",
      });
      const otherLabel = await LabelServices.create(otherAccount.id, {
        name: "Other",
        color: "#000",
      });

      await TransactionServices.create(otherAccount.id, otherWallet.id, { ...makeTransactionData(), accountId: otherAccount.id, walletId: otherWallet.id } as any, [
        { id: otherLabel.id },
      ]);
      await TransactionServices.create(accountId, walletId, makeTransactionData() as any, [{ id: labelId }]);

      const result = await TransactionServices.getAll(accountId, { page: 1, pageSize: 10 });

      expect(result.count).toBe(1);
    });

    it("should filter by type", async () => {
      await TransactionServices.create(accountId, walletId, makeTransactionData({ type: "IN" }) as any, [{ id: labelId }]);
      await TransactionServices.create(accountId, walletId, makeTransactionData({ type: "OUT" }) as any, [{ id: labelId }]);

      const result = await TransactionServices.getAll(accountId, {
        page: 1,
        pageSize: 10,
        type: "IN",
      });

      expect(result.count).toBe(1);
      expect(result.values[0].type).toBe("IN");
    });

    it("should filter by walletId", async () => {
      const wallet2 = await WalletServices.create(accountId, {
        name: "Second Wallet",
        type: "BANK",
        amount: 500,
        color: "#000",
      });

      await TransactionServices.create(accountId, walletId, makeTransactionData() as any, [{ id: labelId }]);
      await TransactionServices.create(accountId, wallet2.id, { ...makeTransactionData(), walletId: wallet2.id } as any, [{ id: labelId }]);

      const result = await TransactionServices.getAll(accountId, {
        page: 1,
        pageSize: 10,
        walletId,
      });

      expect(result.count).toBe(1);
      expect(result.values[0].walletId).toBe(walletId);
    });

    it("should paginate correctly", async () => {
      await TransactionServices.create(accountId, walletId, makeTransactionData() as any, [{ id: labelId }]);
      await TransactionServices.create(accountId, walletId, makeTransactionData() as any, [{ id: labelId }]);
      await TransactionServices.create(accountId, walletId, makeTransactionData() as any, [{ id: labelId }]);

      const page1 = await TransactionServices.getAll(accountId, { page: 1, pageSize: 2 });
      const page2 = await TransactionServices.getAll(accountId, { page: 2, pageSize: 2 });

      expect(page1.values).toHaveLength(2);
      expect(page2.values).toHaveLength(1);
      expect(page1.count).toBe(3);
    });
  });
});
