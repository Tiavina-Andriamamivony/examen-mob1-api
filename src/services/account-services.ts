import { Account } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { v4 } from "uuid";
require('dotenv').config()
;
import { getPrismaClient } from "@/configs";
import { ApiError } from "@/errors";

export class AccountServices {
  static async singUp(userId: string, account: Account) {
    const accountExistEmail = await getPrismaClient().account.findUnique({ where: { email: account.email } });
    if (accountExistEmail) throw new ApiError("Email=" + account.email + " is already used", 400);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(account.password, salt);
    const parsedAccount: Account = { ...account, id: userId, password: hashedPassword };

    const createdAccount = await getPrismaClient().account.create({
      data: { ...parsedAccount },
    });
    createdAccount.password = undefined;
    return createdAccount;
  }

  static async signIn(email: string, password: string) {
    const account = await getPrismaClient().account.findUnique({ where: { email } });

    if (!account) throw new ApiError(`Account with email=${email} not found`, 404);

    const validPassword = await bcrypt.compare(password, account.password);
    if (!validPassword) throw new ApiError(`Bad password`, 400);
    const token = jwt.sign({ id: account.id, email: account.email }, process.env.JWT_SECRET, { expiresIn: "10h" });
    account.password = undefined;
    return { token, account: account };
  }

  static async getOneById(accountId: string) {
    return await getPrismaClient().account.findUnique({ where: { id: accountId } });
  }

  static async requestPasswordReset(email: string) {
    const account = await getPrismaClient().account.findUnique({ where: { email } });
    if (!account) throw new ApiError(`Account with email=${email} not found`, 404);

    const token = v4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const resetRecord = await getPrismaClient().passwordReset.create({
      data: { token, accountId: account.id, expiresAt },
    });

    return { token: resetRecord.token, expiresAt: resetRecord.expiresAt };
  }

  static async confirmPasswordReset(token: string, newPassword: string) {
    const resetRecord = await getPrismaClient().passwordReset.findUnique({ where: { token } });
    if (!resetRecord || resetRecord.used) throw new ApiError("Invalid or already used reset token", 400);
    if (resetRecord.expiresAt < new Date()) throw new ApiError("Reset token has expired", 400);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await getPrismaClient().account.update({
      where: { id: resetRecord.accountId },
      data: { password: hashedPassword },
    });

    await getPrismaClient().passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    return { message: "Password has been reset successfully" };
  }
}
