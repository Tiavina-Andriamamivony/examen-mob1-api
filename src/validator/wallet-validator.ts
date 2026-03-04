import { CreationWallet, UpdateWallet, WalletAutomaticIncome } from "@clients";
import z from "zod";

import { BadRequestError, ForbiddenError } from "@/errors";

const WALLET_TYPES = ["CASH", "MOBILE_MONEY", "BANK", "DEBT"] as const;
const AUTOMATIC_INCOME_TYPES = ["NOT_SPECIFIED", "MENSUAL"] as const;

const createWalletSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  type: z.enum(WALLET_TYPES),
  color: z.string().optional(),
  iconRef: z.string().optional(),
  amount: z.number().min(0),
});

const updateWalletSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  type: z.enum(WALLET_TYPES),
  isActive: z.boolean(),
  color: z.string().optional(),
  iconRef: z.string().optional(),
});

const updateAutomaticIncomeSchema = z.object({
  type: z.enum(AUTOMATIC_INCOME_TYPES),
  amount: z.number().min(0),
  paymentDay: z.number().int().min(1).max(28),
});

const getAllSchema = z.object({
  walletType: z.enum(WALLET_TYPES).optional(),
});

const parseOrThrow = (schema: z.ZodSchema, data: unknown): void => {
  const result = schema.safeParse(data);
  if (!result.success) throw new BadRequestError(z.prettifyError(result.error));
};

export class WalletValidator {
  static create(body: CreationWallet): void {
    parseOrThrow(createWalletSchema, body);
  }

  static update(accountId: string, body: UpdateWallet): void {
    if (body.accountId !== accountId)
      throw new ForbiddenError("Your account is not able to make changes on this element");
    parseOrThrow(updateWalletSchema, body);
  }

  static updateAutomaticIncome(body: WalletAutomaticIncome): void {
    parseOrThrow(updateAutomaticIncomeSchema, body);
  }

  static getAll(query: { walletType?: string }): void {
    parseOrThrow(getAllSchema, query);
  }
}