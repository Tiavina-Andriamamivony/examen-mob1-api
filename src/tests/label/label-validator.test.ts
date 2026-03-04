import { describe, expect, it } from "vitest";

import { BadRequestError } from "@/errors";
import { LabelValidator } from "@/validator/label-validator";

import { makeCreationLabel, makeRestLabel } from "../fixtures/label.fixtures";

describe("LabelValidator", () => {
  describe("create", () => {
    it("should pass with valid data", () => {
      expect(() => LabelValidator.create(makeCreationLabel())).not.toThrow();
    });

    it("should throw BadRequestError when name is empty", () => {
      expect(() => LabelValidator.create(makeCreationLabel({ name: "" }))).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when name is missing", () => {
      expect(() => LabelValidator.create({})).toThrow(BadRequestError);
    });

    it("should pass when optional fields are missing", () => {
      expect(() => LabelValidator.create({ name: "Food" })).not.toThrow();
    });

    it("should pass when iconRef is undefined", () => {
      expect(() => LabelValidator.create(makeCreationLabel({ iconRef: undefined }))).not.toThrow();
    });
  });

  describe("update", () => {
    it("should pass with valid data", () => {
      expect(() => LabelValidator.update("account-123", makeRestLabel({ id: "label-123" }))).not.toThrow();
    });

    it("should throw BadRequestError when id is missing", () => {
      expect(() => LabelValidator.update("account-123", makeRestLabel({ id: undefined }))).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when name is empty", () => {
      expect(() => LabelValidator.update("account-123", makeRestLabel({ name: "" }))).toThrow(BadRequestError);
    });
  });
});
