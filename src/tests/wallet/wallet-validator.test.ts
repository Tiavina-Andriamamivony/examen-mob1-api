import { describe, it, expect } from "vitest";
import { WalletValidator } from "@/validator/wallet-validator";
import { BadRequestError, ForbiddenError } from "@/errors";
import {
  ACCOUNT_ID,
  WALLET_ID,
  makeCreationWallet,
  makeUpdateWallet,
  makeAutomaticIncome,
} from "../fixtures/wallet.fixtures";

describe("WalletValidator", () => {
  describe("create", () => {
    it("should pass with valid data", () => {
      expect(() => WalletValidator.create(makeCreationWallet())).not.toThrow();
    });

    it("should throw BadRequestError when name is empty", () => {
      expect(() => WalletValidator.create(makeCreationWallet({ name: "" })))
        .toThrow(BadRequestError);
    });

    it("should throw BadRequestError when type is invalid", () => {
      expect(() => WalletValidator.create(makeCreationWallet({ type: "INVALID" as any })))
        .toThrow(BadRequestError);
    });

    it("should throw BadRequestError when amount is negative", () => {
      expect(() => WalletValidator.create(makeCreationWallet({ amount: -1 })))
        .toThrow(BadRequestError);
    });

    it("should pass when description is null", () => {
      expect(() => WalletValidator.create(makeCreationWallet({ description: null as any })))
        .not.toThrow();
    });

    it("should pass when optional fields are missing", () => {
      const { color, iconRef, ...minimal } = makeCreationWallet();
      expect(() => WalletValidator.create(minimal)).not.toThrow();
    });

    it.each(["CASH", "MOBILE_MONEY", "BANK", "DEBT"] as const)(
      "should pass for wallet type %s",
      (type) => {
        expect(() => WalletValidator.create(makeCreationWallet({ type }))).not.toThrow();
      }
    );
  });

  describe("update", () => {
    it("should pass with valid data and matching accountId", () => {
      expect(() => WalletValidator.update(ACCOUNT_ID, makeUpdateWallet())).not.toThrow();
    });

    it("should throw ForbiddenError when accountId does not match", () => {
      expect(() => WalletValidator.update("other-account", makeUpdateWallet()))
        .toThrow(ForbiddenError);
    });

    it("should throw BadRequestError when name is empty", () => {
      expect(() => WalletValidator.update(ACCOUNT_ID, makeUpdateWallet({ name: "" })))
        .toThrow(BadRequestError);
    });

    it("should throw BadRequestError when type is invalid", () => {
      expect(() => WalletValidator.update(ACCOUNT_ID, makeUpdateWallet({ type: "INVALID" as any })))
        .toThrow(BadRequestError);
    });

    it("should throw BadRequestError when isActive is missing", () => {
      const { isActive, ...body } = makeUpdateWallet();
      expect(() => WalletValidator.update(ACCOUNT_ID, body as any))
        .toThrow(BadRequestError);
    });
  });

  describe("updateAutomaticIncome", () => {
    it("should pass with valid MENSUAL data", () => {
      expect(() => WalletValidator.updateAutomaticIncome(makeAutomaticIncome())).not.toThrow();
    });

    it("should pass with NOT_SPECIFIED type", () => {
      expect(() =>
        WalletValidator.updateAutomaticIncome(makeAutomaticIncome({ type: "NOT_SPECIFIED" }))
      ).not.toThrow();
    });

    it("should throw BadRequestError when type is invalid", () => {
      expect(() =>
        WalletValidator.updateAutomaticIncome(makeAutomaticIncome({ type: "DAILY" as any }))
      ).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when amount is negative", () => {
      expect(() =>
        WalletValidator.updateAutomaticIncome(makeAutomaticIncome({ amount: -1 }))
      ).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when paymentDay is 0", () => {
      expect(() =>
        WalletValidator.updateAutomaticIncome(makeAutomaticIncome({ paymentDay: 0 }))
      ).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when paymentDay exceeds 28", () => {
      expect(() =>
        WalletValidator.updateAutomaticIncome(makeAutomaticIncome({ paymentDay: 29 }))
      ).toThrow(BadRequestError);
    });

    it("should pass when paymentDay is exactly 28", () => {
      expect(() =>
        WalletValidator.updateAutomaticIncome(makeAutomaticIncome({ paymentDay: 28 }))
      ).not.toThrow();
    });
  });

  describe("getAll", () => {
    it("should pass with no filters", () => {
      expect(() => WalletValidator.getAll({})).not.toThrow();
    });

    it("should pass with valid walletType", () => {
      expect(() => WalletValidator.getAll({ walletType: "CASH" })).not.toThrow();
    });

    it("should throw BadRequestError with invalid walletType", () => {
      expect(() => WalletValidator.getAll({ walletType: "INVALID" }))
        .toThrow(BadRequestError);
    });
  });
});