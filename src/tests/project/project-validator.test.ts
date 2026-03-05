import { describe, expect, it } from "vitest";

import { BadRequestError } from "@/errors";
import { ProjectValidator } from "@/validator/project-validator";

import { makeCreationProject, makeCreationProjectTransaction } from "../fixtures/project.fixtures";

describe("ProjectValidator", () => {
  describe("create", () => {
    it("should pass with valid data", () => {
      expect(() => ProjectValidator.create(makeCreationProject())).not.toThrow();
    });

    it("should throw BadRequestError when name is missing", () => {
      expect(() => ProjectValidator.create(makeCreationProject({ name: "" }))).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when name is empty string", () => {
      expect(() => ProjectValidator.create({ ...makeCreationProject(), name: "" })).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when initialBudget is negative", () => {
      expect(() => ProjectValidator.create(makeCreationProject({ initialBudget: -1 }))).toThrow(BadRequestError);
    });

    it("should pass when initialBudget is zero", () => {
      expect(() => ProjectValidator.create(makeCreationProject({ initialBudget: 0 }))).not.toThrow();
    });

    it("should pass when optional fields are missing", () => {
      expect(() => ProjectValidator.create({ name: "Test", initialBudget: 1000 })).not.toThrow();
    });

    it("should pass when description is null", () => {
      expect(() => ProjectValidator.create(makeCreationProject({ description: null as any }))).not.toThrow();
    });
  });

  describe("createTransaction", () => {
    it("should pass with valid data", () => {
      expect(() => ProjectValidator.createTransaction(makeCreationProjectTransaction())).not.toThrow();
    });

    it("should throw BadRequestError when name is empty", () => {
      expect(() => ProjectValidator.createTransaction(makeCreationProjectTransaction({ name: "" }))).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when estimatedCost is negative", () => {
      expect(() => ProjectValidator.createTransaction(makeCreationProjectTransaction({ estimatedCost: -1 }))).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when realCost is negative", () => {
      expect(() => ProjectValidator.createTransaction(makeCreationProjectTransaction({ realCost: -1 }))).toThrow(BadRequestError);
    });

    it("should pass when realCost is zero", () => {
      expect(() => ProjectValidator.createTransaction(makeCreationProjectTransaction({ realCost: 0 }))).not.toThrow();
    });

    it("should pass when realCost is missing", () => {
      expect(() => ProjectValidator.createTransaction({ name: "Test", estimatedCost: 100 })).not.toThrow();
    });
  });

  describe("updateTransaction", () => {
    it("should pass with valid partial data", () => {
      expect(() => ProjectValidator.updateTransaction({ name: "Updated" })).not.toThrow();
    });

    it("should pass with empty object", () => {
      expect(() => ProjectValidator.updateTransaction({})).not.toThrow();
    });

    it("should throw BadRequestError when name is empty string", () => {
      expect(() => ProjectValidator.updateTransaction({ name: "" })).toThrow(BadRequestError);
    });

    it("should throw BadRequestError when estimatedCost is negative", () => {
      expect(() => ProjectValidator.updateTransaction({ estimatedCost: -100 })).toThrow(BadRequestError);
    });
  });
});
