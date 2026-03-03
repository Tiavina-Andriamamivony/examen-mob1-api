import { z } from "zod";

import { ApiError } from "@/errors";

const createUserSchema = z.object({
  password: z.string().min(8),
  email: z.string().email(),
});

const resetRequestSchema = z.object({
  email: z.string().email(),
});

const resetConfirmSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8),
});

type CreateUser = z.infer<typeof createUserSchema>;
type ResetRequest = z.infer<typeof resetRequestSchema>;
type ResetConfirm = z.infer<typeof resetConfirmSchema>;

export class AccountValidator {
  public static create(account: CreateUser) {
    const result = createUserSchema.safeParse(account);
    if (!result.success) throw new ApiError(z.prettifyError(result.error), 400);
  }

  public static resetRequest(data: ResetRequest) {
    const result = resetRequestSchema.safeParse(data);
    if (!result.success) throw new ApiError(z.prettifyError(result.error), 400);
  }

  public static resetConfirm(data: ResetConfirm) {
    const result = resetConfirmSchema.safeParse(data);
    if (!result.success) throw new ApiError(z.prettifyError(result.error), 400);
  }
}
