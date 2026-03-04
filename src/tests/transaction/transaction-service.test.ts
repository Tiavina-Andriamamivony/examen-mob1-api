import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPrismaClient } from "@/configs";
import { NotFoundError } from "@/errors";
import { TransactionServices } from "@/services/transaction-services";
import { WalletServices } from "@/services/wallet-services";
import { LabelValidator } from "@/validator";

import { TRANSACTION_ACCOUNT_ID, TRANSACTION_ID, TRANSACTION_WALLET_ID, makePrismaTransaction } from "../fixtures/transaction.fixtures";

vi.mock("@/configs", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/services/wallet-services");
vi.mock("@/validator");

const mockDb = {
  transaction: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
  wallet: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getPrismaClient).mockReturnValue(mockDb as any);
  vi.mocked(WalletServices.getOneById).mockResolvedValue({
    id: TRANSACTION_WALLET_ID,
    amount: 1000,
    accountId: TRANSACTION_ACCOUNT_ID,
  } as any);
  vi.mocked(LabelValidator.list).mockResolvedValue([{ id: "label-456" }]);
});

describe("TransactionServices", () => {
  describe("create", () => {
    it("should create a transaction successfully", async () => {
      const transaction = makePrismaTransaction();
      mockDb.transaction.create.mockResolvedValue(transaction);
      mockDb.wallet.update.mockResolvedValue({});

      const result = await TransactionServices.create(TRANSACTION_ACCOUNT_ID, TRANSACTION_WALLET_ID, transaction, [{ id: "label-456" }]);

      expect(mockDb.transaction.create).toHaveBeenCalled();
      expect(result).toEqual(transaction);
    });

    it("should update wallet amount when transaction date is in the past and type is IN", async () => {
      const transaction = makePrismaTransaction({
        date: new Date("2020-01-01"),
        type: "IN",
        amount: 100,
      });
      mockDb.transaction.create.mockResolvedValue(transaction);
      mockDb.wallet.update.mockResolvedValue({});

      await TransactionServices.create(TRANSACTION_ACCOUNT_ID, TRANSACTION_WALLET_ID, transaction, [{ id: "label-456" }]);

      expect(mockDb.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 1100 }),
        }),
      );
    });

    it("should decrease wallet amount for OUT transaction", async () => {
      const transaction = makePrismaTransaction({
        date: new Date("2020-01-01"),
        type: "OUT",
        amount: 100,
      });
      mockDb.transaction.create.mockResolvedValue(transaction);
      mockDb.wallet.update.mockResolvedValue({});

      await TransactionServices.create(TRANSACTION_ACCOUNT_ID, TRANSACTION_WALLET_ID, transaction, [{ id: "label-456" }]);

      expect(mockDb.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 900 }),
        }),
      );
    });

    it("should not update wallet when transaction date is in the future", async () => {
      const transaction = makePrismaTransaction({
        date: new Date("2099-01-01"),
        type: "IN",
        amount: 100,
      });
      mockDb.transaction.create.mockResolvedValue(transaction);

      await TransactionServices.create(TRANSACTION_ACCOUNT_ID, TRANSACTION_WALLET_ID, transaction, [{ id: "label-456" }]);

      expect(mockDb.wallet.update).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update a transaction successfully", async () => {
      const existing = makePrismaTransaction({ amount: 100, type: "IN" });
      const updated = makePrismaTransaction({ amount: 200, type: "IN" });
      mockDb.transaction.findFirst.mockResolvedValue(existing);
      mockDb.transaction.update.mockResolvedValue(updated);
      mockDb.wallet.update.mockResolvedValue({});

      const result = await TransactionServices.update(TRANSACTION_ACCOUNT_ID, TRANSACTION_WALLET_ID, TRANSACTION_ID, updated, [{ id: "label-456" }]);

      expect(mockDb.transaction.update).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it("should throw NotFoundError when transaction does not exist", async () => {
      mockDb.transaction.findFirst.mockResolvedValue(null);

      await expect(TransactionServices.update(TRANSACTION_ACCOUNT_ID, TRANSACTION_WALLET_ID, TRANSACTION_ID, makePrismaTransaction(), [{ id: "label-456" }])).rejects.toThrow(
        NotFoundError,
      );

      expect(mockDb.transaction.update).not.toHaveBeenCalled();
    });

    it("should reverse old amount and apply new amount when amount changes", async () => {
      const existing = makePrismaTransaction({
        date: new Date("2020-01-01"),
        amount: 100,
        type: "IN",
      });
      const updated = makePrismaTransaction({
        date: new Date("2020-01-01"),
        amount: 200,
        type: "IN",
      });
      mockDb.transaction.findFirst.mockResolvedValue(existing);
      mockDb.transaction.update.mockResolvedValue(updated);
      mockDb.wallet.update.mockResolvedValue({});

      await TransactionServices.update(TRANSACTION_ACCOUNT_ID, TRANSACTION_WALLET_ID, TRANSACTION_ID, updated, [{ id: "label-456" }]);

      expect(mockDb.wallet.update).toHaveBeenCalledTimes(2);
    });
  });

  describe("getOneById", () => {
    it("should return transaction when found", async () => {
      const transaction = makePrismaTransaction();
      mockDb.transaction.findFirst.mockResolvedValue(transaction);

      const result = await TransactionServices.getOneById(TRANSACTION_ACCOUNT_ID, TRANSACTION_WALLET_ID, TRANSACTION_ID);

      expect(mockDb.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          id: TRANSACTION_ID,
          walletId: TRANSACTION_WALLET_ID,
          accountId: TRANSACTION_ACCOUNT_ID,
        },
        include: { labels: true },
      });
      expect(result).toEqual(transaction);
    });

    it("should throw NotFoundError when transaction does not exist", async () => {
      mockDb.transaction.findFirst.mockResolvedValue(null);

      await expect(TransactionServices.getOneById(TRANSACTION_ACCOUNT_ID, TRANSACTION_WALLET_ID, TRANSACTION_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteOneById", () => {
    it("should delete transaction and reverse wallet amount for IN transaction", async () => {
      const transaction = makePrismaTransaction({
        date: new Date("2020-01-01"),
        type: "IN",
        amount: 100,
      });
      mockDb.transaction.findFirst.mockResolvedValue(transaction);
      mockDb.transaction.delete.mockResolvedValue(transaction);
      mockDb.wallet.update.mockResolvedValue({});

      await TransactionServices.deleteOneById(TRANSACTION_ACCOUNT_ID, TRANSACTION_WALLET_ID, TRANSACTION_ID);

      expect(mockDb.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 900 }),
        }),
      );
      expect(mockDb.transaction.delete).toHaveBeenCalledWith({
        where: {
          id: TRANSACTION_ID,
          walletId: TRANSACTION_WALLET_ID,
          accountId: TRANSACTION_ACCOUNT_ID,
        },
      });
    });

    it("should delete transaction and reverse wallet amount for OUT transaction", async () => {
      const transaction = makePrismaTransaction({
        date: new Date("2020-01-01"),
        type: "OUT",
        amount: 100,
      });
      mockDb.transaction.findFirst.mockResolvedValue(transaction);
      mockDb.transaction.delete.mockResolvedValue(transaction);
      mockDb.wallet.update.mockResolvedValue({});

      await TransactionServices.deleteOneById(TRANSACTION_ACCOUNT_ID, TRANSACTION_WALLET_ID, TRANSACTION_ID);

      expect(mockDb.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 1100 }),
        }),
      );
    });

    it("should throw NotFoundError when transaction does not exist", async () => {
      mockDb.transaction.findFirst.mockResolvedValue(null);

      await expect(TransactionServices.deleteOneById(TRANSACTION_ACCOUNT_ID, TRANSACTION_WALLET_ID, TRANSACTION_ID)).rejects.toThrow(NotFoundError);

      expect(mockDb.transaction.delete).not.toHaveBeenCalled();
    });
  });

  describe("getAll", () => {
    it("should return transactions and count", async () => {
      const transactions = [makePrismaTransaction()];
      mockDb.$transaction.mockResolvedValue([transactions, 1]);

      const result = await TransactionServices.getAll(TRANSACTION_ACCOUNT_ID, {
        page: 1,
        pageSize: 10,
      });

      expect(result.values).toEqual(transactions);
      expect(result.count).toBe(1);
    });

    it("should paginate correctly", async () => {
      mockDb.$transaction.mockResolvedValue([[], 0]);

      await TransactionServices.getAll(TRANSACTION_ACCOUNT_ID, { page: 2, pageSize: 5 });

      expect(mockDb.$transaction).toHaveBeenCalled();
    });

    it("should filter by walletId when provided", async () => {
      mockDb.$transaction.mockResolvedValue([[], 0]);

      await TransactionServices.getAll(TRANSACTION_ACCOUNT_ID, {
        page: 1,
        pageSize: 10,
        walletId: TRANSACTION_WALLET_ID,
      });

      expect(mockDb.$transaction).toHaveBeenCalled();
    });
  });
});
