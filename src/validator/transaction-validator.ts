import { CreationTransaction, Transaction } from "@clients";
import z from "zod";

import { BadRequestError, ForbiddenError } from "@/errors";
import { TransactionFilters } from "@/types";

const TRANSACTION_TYPES = ["IN", "OUT"] as const;
const SORT_BY_VALUES = ["date", "amount"] as const;
const SORT_VALUES = ["asc", "desc"] as const;

const createTransactionSchema = z.object({
  date: z.preprocess(
    (val) => (val instanceof Date ? val.toISOString() : val),
    z.string().refine((value) => new Date(value).toString() !== "Invalid Date", "Invalid date format"),
  ),
  labels: z.array(z.object({ id: z.string() })).min(1, "At least one label is required"),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().min(1, "Amount must be greater than 0"),
  description: z.string().optional(),
});

const updateTransactionSchema = createTransactionSchema;

const filtersSchema = z.object({
  type: z.enum(TRANSACTION_TYPES).optional(),
  sortBy: z.enum(SORT_BY_VALUES).optional(),
  sort: z.enum(SORT_VALUES).optional(),
  startingDate: z
    .string()
    .refine((value) => !value || new Date(value).toString() !== "Invalid Date", "Invalid startingDate format")
    .optional(),
  endingDate: z
    .string()
    .refine((value) => !value || new Date(value).toString() !== "Invalid Date", "Invalid endingDate format")
    .optional(),
  minAmount: z
    .string()
    .refine((value) => !value || /^-?\d+(\.\d+)?$/.test(value), "minAmount must be a valid number")
    .optional(),
  maxAmount: z
    .string()
    .refine((value) => !value || /^-?\d+(\.\d+)?$/.test(value), "maxAmount must be a valid number")
    .optional(),
});

const parseOrThrow = (schema: z.ZodSchema, data: unknown): void => {
  const result = schema.safeParse(data);
  if (!result.success) throw new BadRequestError(z.prettifyError(result.error));
};

export class TransactionValidator {
  static create(body: CreationTransaction): void {
    parseOrThrow(createTransactionSchema, body);
  }

  static update(accountId: string, body: Transaction): void {
    if (body.accountId !== accountId) throw new ForbiddenError("Your account is not able to make changes on this element");
    parseOrThrow(updateTransactionSchema, body);
  }

  static filters(filters: Partial<TransactionFilters>): void {
    parseOrThrow(filtersSchema, filters);
  }
}
