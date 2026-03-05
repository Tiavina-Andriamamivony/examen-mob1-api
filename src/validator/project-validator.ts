import { CreationProject, CreationProjectTransaction, ProjectTransaction } from "@clients";
import z from "zod";

import { BadRequestError } from "@/errors";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().nullable().optional(),
  initialBudget: z.number().min(0, "Initial budget must be positive"),
  color: z.string().optional(),
  iconRef: z.string().nullable().optional(),
});

const createProjectTransactionSchema = z.object({
  name: z.string().min(1, "Transaction name is required"),
  description: z.string().nullable().optional(),
  estimatedCost: z.number().min(0, "Estimated cost must be positive"),
  realCost: z.number().min(0, "Real cost must be positive or zero").optional(),
});

const updateProjectTransactionSchema = z.object({
  name: z.string().min(1, "Transaction name is required").optional(),
  description: z.string().nullable().optional(),
  estimatedCost: z.number().min(0, "Estimated cost must be positive").optional(),
  realCost: z.number().min(0, "Real cost must be positive or zero").optional(),
});

const parseOrThrow = (schema: z.ZodSchema, data: unknown): void => {
  const result = schema.safeParse(data);
  if (!result.success) throw new BadRequestError(z.prettifyError(result.error));
};

export class ProjectValidator {
  static create(body: CreationProject): void {
    parseOrThrow(createProjectSchema, body);
  }

  static createTransaction(body: CreationProjectTransaction): void {
    parseOrThrow(createProjectTransactionSchema, body);
  }

  static updateTransaction(body: Partial<ProjectTransaction>): void {
    parseOrThrow(updateProjectTransactionSchema, body);
  }
}
