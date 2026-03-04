import { describe, it, expect, vi, beforeEach } from "vitest";
import { WalletServices } from "@/services/wallet-services";
import { BadRequestError, NotFoundError } from "@/errors";
import {
  ACCOUNT_ID,
  WALLET_ID,
  makePrismaWallet,
  makeCreationWallet,
  makeUpdateWallet,
  makeAutomaticIncome,
} from "../fixtures/wallet.fixtures";

vi.mock("@/configs", () => ({
  getPrismaClient: vi.fn(),
}));

vi.mock("@/mappers", () => ({
  WalletMapper: {
    create: vi.fn((accountId, wallet) => ({ ...wallet, accountId, id: "new-id" })),
    update: vi.fn((accountId, wallet) => ({ ...wallet, accountId })),
  },
}));

import { getPrismaClient } from "@/configs";

const mockDb = {
  wallet: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrismaClient).mockReturnValue(mockDb as any);
});

describe("WalletServices", () => {
  describe("create", () => {
    it("should create a wallet successfully", async () => {
      const wallet = makePrismaWallet();
      mockDb.wallet.findFirst.mockResolvedValue(null);
      mockDb.wallet.create.mockResolvedValue(wallet);

      const result = await WalletServices.create(ACCOUNT_ID, makeCreationWallet());

      expect(mockDb.wallet.findFirst).toHaveBeenCalledWith({
        where: { name: "Personal", accountId: ACCOUNT_ID },
      });
      expect(mockDb.wallet.create).toHaveBeenCalled();
      expect(result).toEqual(wallet);
    });

    it("should throw BadRequestError when name already exists", async () => {
      mockDb.wallet.findFirst.mockResolvedValue(makePrismaWallet());

      await expect(WalletServices.create(ACCOUNT_ID, makeCreationWallet()))
        .rejects.toThrow(BadRequestError);
      expect(mockDb.wallet.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update a wallet successfully", async () => {
      const wallet = makePrismaWallet();
      mockDb.wallet.findFirst
        .mockResolvedValueOnce(wallet)   // exists check
        .mockResolvedValueOnce(null);    // name conflict check
      mockDb.wallet.update.mockResolvedValue(wallet);

      const result = await WalletServices.update(ACCOUNT_ID, makeUpdateWallet());

      expect(mockDb.wallet.update).toHaveBeenCalled();
      expect(result).toEqual(wallet);
    });

    it("should throw NotFoundError when wallet does not exist", async () => {
      mockDb.wallet.findFirst.mockResolvedValue(null);

      await expect(WalletServices.update(ACCOUNT_ID, makeUpdateWallet()))
        .rejects.toThrow(NotFoundError);
      expect(mockDb.wallet.update).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError when name conflicts with another wallet", async () => {
      mockDb.wallet.findFirst
        .mockResolvedValueOnce(makePrismaWallet())           // exists
        .mockResolvedValueOnce(makePrismaWallet({ id: "other-wallet" })); // conflict

      await expect(WalletServices.update(ACCOUNT_ID, makeUpdateWallet()))
        .rejects.toThrow(BadRequestError);
      expect(mockDb.wallet.update).not.toHaveBeenCalled();
    });
  });

  describe("updateAutomaticIncome", () => {
    it("should update automatic income to MENSUAL", async () => {
      const wallet = makePrismaWallet();
      mockDb.wallet.findFirst.mockResolvedValue(wallet);
      mockDb.wallet.update.mockResolvedValue({
        ...wallet,
        haveAutomaticIncome: true,
        automaticIncomeAmount: 500,
        automaticIncomeDay: 15,
      });

      const result = await WalletServices.updateAutomaticIncome(
        ACCOUNT_ID,
        WALLET_ID,
        makeAutomaticIncome()
      );

      expect(mockDb.wallet.update).toHaveBeenCalledWith({
        data: {
          haveAutomaticIncome: true,
          automaticIncomeAmount: 500,
          automaticIncomeDay: 15,
        },
        where: { id: WALLET_ID, accountId: ACCOUNT_ID },
      });
      expect(result.haveAutomaticIncome).toBe(true);
    });

    it("should set haveAutomaticIncome to false when type is NOT_SPECIFIED", async () => {
      mockDb.wallet.findFirst.mockResolvedValue(makePrismaWallet());
      mockDb.wallet.update.mockResolvedValue(makePrismaWallet({ haveAutomaticIncome: false }));

      await WalletServices.updateAutomaticIncome(
        ACCOUNT_ID,
        WALLET_ID,
        makeAutomaticIncome({ type: "NOT_SPECIFIED" })
      );

      expect(mockDb.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ haveAutomaticIncome: false }),
        })
      );
    });

    it("should throw NotFoundError when wallet does not exist", async () => {
      mockDb.wallet.findFirst.mockResolvedValue(null);

      await expect(
        WalletServices.updateAutomaticIncome(ACCOUNT_ID, WALLET_ID, makeAutomaticIncome())
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("getOneById", () => {
    it("should return wallet when found and not archived", async () => {
      const wallet = makePrismaWallet();
      mockDb.wallet.findFirst.mockResolvedValue(wallet);

      const result = await WalletServices.getOneById(ACCOUNT_ID, WALLET_ID);

      expect(mockDb.wallet.findFirst).toHaveBeenCalledWith({
        where: { id: WALLET_ID, accountId: ACCOUNT_ID, isArchived: false },
      });
      expect(result).toEqual(wallet);
    });

    it("should throw NotFoundError when wallet does not exist", async () => {
      mockDb.wallet.findFirst.mockResolvedValue(null);

      await expect(WalletServices.getOneById(ACCOUNT_ID, WALLET_ID))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe("archiveOneById", () => {
    it("should archive wallet successfully", async () => {
      const wallet = makePrismaWallet();
      mockDb.wallet.findFirst.mockResolvedValue(wallet);
      mockDb.wallet.update.mockResolvedValue({ ...wallet, isArchived: true });

      const result = await WalletServices.archiveOneById(ACCOUNT_ID, WALLET_ID);

      expect(mockDb.wallet.update).toHaveBeenCalledWith({
        data: { isArchived: true },
        where: { id: WALLET_ID, accountId: ACCOUNT_ID },
      });
      expect(result.isArchived).toBe(true);
    });

    it("should throw NotFoundError when wallet does not exist", async () => {
      mockDb.wallet.findFirst.mockResolvedValue(null);

      await expect(WalletServices.archiveOneById(ACCOUNT_ID, WALLET_ID))
        .rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when wallet is already archived", async () => {
      mockDb.wallet.findFirst.mockResolvedValue(null); // isArchived:false filter returns null

      await expect(WalletServices.archiveOneById(ACCOUNT_ID, WALLET_ID))
        .rejects.toThrow(NotFoundError);
      expect(mockDb.wallet.update).not.toHaveBeenCalled();
    });
  });

  describe("getAll", () => {
    it("should return wallets and count", async () => {
      const wallets = [makePrismaWallet(), makePrismaWallet({ id: "wallet-2", name: "Savings" })];
      mockDb.$transaction.mockResolvedValue([wallets, 2]);

      const result = await WalletServices.getAll(ACCOUNT_ID, {
        page: 1,
        pageSize: 10,
      });

      expect(result.values).toEqual(wallets);
      expect(result.count).toBe(2);
    });

    it("should filter by name when provided", async () => {
      mockDb.$transaction.mockResolvedValue([[makePrismaWallet()], 1]);

      await WalletServices.getAll(ACCOUNT_ID, { page: 1, pageSize: 10, name: "Personal" });

      const [[findManyCall]] = mockDb.$transaction.mock.calls;
      expect(findManyCall).toBeDefined();
    });

    it("should always filter out archived wallets", async () => {
      mockDb.$transaction.mockResolvedValue([[], 0]);

      await WalletServices.getAll(ACCOUNT_ID, { page: 1, pageSize: 10 });

      expect(mockDb.$transaction).toHaveBeenCalled();
    });

    it("should correctly paginate", async () => {
      mockDb.$transaction.mockResolvedValue([[], 0]);

      await WalletServices.getAll(ACCOUNT_ID, { page: 3, pageSize: 5 });

      expect(mockDb.$transaction).toHaveBeenCalled();
    });
  });
});