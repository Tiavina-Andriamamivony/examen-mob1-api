import { CreationGoal, Goal as RestGoal } from "@clients";
import z from "zod";

import { BadRequestError, ForbiddenError } from "@/errors";
import { WalletServices } from "@/services";
import { GoalFilters } from "@/types";

const SORT_BY_VALUES = ["startingDate", "endingDate", "amount", "createdAt", "name"] as const;
const SORT_VALUES = ["asc", "desc"] as const;

const isValidDate = (value: unknown): boolean => typeof value === "string" && new Date(value).toString() !== "Invalid Date";

const createGoalSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    amount: z.number().min(1, "Amount must be greater than 0"),
    startingDate: z.union([z.string(), z.date()]).refine((v) => isValidDate(v instanceof Date ? v.toISOString() : v), "startingDate is invalid"),
    endingDate: z.union([z.string(), z.date()]).refine((v) => isValidDate(v instanceof Date ? v.toISOString() : v), "endingDate is invalid"),
    color: z.string().optional(),
    iconRef: z.string().optional(),
    walletId: z.string().optional(),
  })
  .refine(
    ({ startingDate, endingDate }) => new Date(startingDate as string).getTime() <= new Date(endingDate as string).getTime(),
    "Starting date must be before or equal to ending date",
  );

const filtersSchema = z
  .object({
    name: z.string().optional(),
    walletId: z.string().optional(),
    sortBy: z.enum(SORT_BY_VALUES).optional(),
    sort: z.enum(SORT_VALUES).optional(),
    startingDateBeginning: z
      .string()
      .refine((v) => !v || isValidDate(v), "startingDateBeginning is invalid")
      .optional(),
    startingDateEnding: z
      .string()
      .refine((v) => !v || isValidDate(v), "startingDateEnding is invalid")
      .optional(),
    endingDateBeginning: z
      .string()
      .refine((v) => !v || isValidDate(v), "endingDateBeginning is invalid")
      .optional(),
    endingDateEnding: z
      .string()
      .refine((v) => !v || isValidDate(v), "endingDateEnding is invalid")
      .optional(),
    minAmount: z
      .string()
      .refine((v) => !v || /^-?\d+(\.\d+)?$/.test(v), "minAmount must be a valid number")
      .optional(),
    maxAmount: z
      .string()
      .refine((v) => !v || /^-?\d+(\.\d+)?$/.test(v), "maxAmount must be a valid number")
      .optional(),
  })
  .refine(
    ({ startingDateBeginning, startingDateEnding }) =>
      !startingDateBeginning || !startingDateEnding || new Date(startingDateBeginning).getTime() <= new Date(startingDateEnding).getTime(),
    "startingDateBeginning must be before startingDateEnding",
  )
  .refine(
    ({ endingDateBeginning, endingDateEnding }) => !endingDateBeginning || !endingDateEnding || new Date(endingDateBeginning).getTime() <= new Date(endingDateEnding).getTime(),
    "endingDateBeginning must be before endingDateEnding",
  )
  .refine(({ minAmount, maxAmount }) => !minAmount || !maxAmount || +minAmount <= +maxAmount, "minAmount must be lower than maxAmount");

const parseOrThrow = (schema: z.ZodSchema, data: unknown): void => {
  const result = schema.safeParse(data);
  if (!result.success) throw new BadRequestError(z.prettifyError(result.error));
};

export class GoalValidator {
  static async create(accountId: string, walletId: string, body: CreationGoal): Promise<void> {
    await WalletServices.getOneById(accountId, walletId);
    parseOrThrow(createGoalSchema, body);
  }

  static update(accountId: string, body: RestGoal): void {
    if (body.accountId !== undefined && body.accountId !== accountId) throw new ForbiddenError("Your account is not able to make changes on this element");
    parseOrThrow(createGoalSchema, body);
  }

  static filters(filters: Partial<GoalFilters>): void {
    parseOrThrow(filtersSchema, filters);
  }
}
