import { describe, expect, it } from "vitest";

import { BadRequestError, ForbiddenError } from "@/errors";
import { TransactionValidator } from "@/validator/transaction-validator";

import { TRANSACTION_ACCOUNT_ID, makeCreationTransaction, makeRestTransaction } from "../fixtures/transaction.fixtures";

describe("TransactionValidator", () => {
  describe("create", () => {
    it("should pass with valid data", () => {
      expect(() => TransactionValidator.create(makeCreationTransaction())).not.toThrow();
    });

    it("should pass when date is a Date object", () => {
      expect(() => TransactionValidator.create(makeCreationTransaction({ date: new Date("2024-01-01") }))).not.toThrow();
    });

    it("should pass when date is a valid ISO string", () => {
      expect(() => TransactionValidator.create(makeCreationTransaction({ date: "2024-01-01" as any }))).not.toThrow();
    });

    it("should throw BadRequestError when date is an invalid string", () => {
      expect(() => TransactionValidator.create(makeCreationTransaction({ date: "not-a-date" as any }))).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when type is invalid", () => {
      expect(() => TransactionValidator.create(makeCreationTransaction({ type: "INVALID" as any }))).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when amount is zero", () => {
      expect(() => TransactionValidator.create(makeCreationTransaction({ amount: 0 }))).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when amount is negative", () => {
      expect(() => TransactionValidator.create(makeCreationTransaction({ amount: -1 }))).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when labels array is empty", () => {
      expect(() => TransactionValidator.create(makeCreationTransaction({ labels: [] }))).toThrow(BadRequestError);
    });

    it.each(["IN", "OUT"] as const)("should pass for type %s", (type) => {
      expect(() => TransactionValidator.create(makeCreationTransaction({ type }))).not.toThrow();
    });
  });

  describe("update", () => {
    it("should pass with valid data and matching accountId", () => {
      expect(() => TransactionValidator.update(TRANSACTION_ACCOUNT_ID, makeRestTransaction({ accountId: TRANSACTION_ACCOUNT_ID }))).not.toThrow();
    });

    it("should throw ForbiddenError when accountId does not match", () => {
      expect(() => TransactionValidator.update("other-account", makeRestTransaction({ accountId: TRANSACTION_ACCOUNT_ID }))).toThrow(ForbiddenError);
    });

    it("should throw BadRequestError when type is invalid", () => {
      expect(() => TransactionValidator.update(TRANSACTION_ACCOUNT_ID, makeRestTransaction({ type: "INVALID" as any }))).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when amount is zero", () => {
      expect(() => TransactionValidator.update(TRANSACTION_ACCOUNT_ID, makeRestTransaction({ amount: 0 }))).toThrow(BadRequestError);
    });
  });

  describe("filters", () => {
    it("should pass with no filters", () => {
      expect(() => TransactionValidator.filters({} as any)).not.toThrow();
    });

    it("should pass with valid type filter", () => {
      expect(() => TransactionValidator.filters({ type: "IN" } as any)).not.toThrow();
    });

    it("should throw BadRequestError with invalid type", () => {
      expect(() => TransactionValidator.filters({ type: "INVALID" } as any)).toThrow(BadRequestError);
    });

    it("should throw BadRequestError with invalid sortBy", () => {
      expect(() => TransactionValidator.filters({ sortBy: "INVALID" } as any)).toThrow(BadRequestError);
    });

    it("should throw BadRequestError with invalid sort", () => {
      expect(() => TransactionValidator.filters({ sort: "INVALID" } as any)).toThrow(BadRequestError);
    });

    it("should pass with valid sort and sortBy", () => {
      expect(() => TransactionValidator.filters({ sort: "asc", sortBy: "amount" } as any)).not.toThrow();
    });
  });
});
