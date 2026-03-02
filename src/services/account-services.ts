import { Account } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
require('dotenv').config()
;
import { getPrismaClient } from "@/configs";
import { ApiError } from "@/errors";

export class AccountServices {
  static async singUp(userId: string, account: Account) {
    const accountExistUsername = await getPrismaClient().account.findUnique({ where: { username: account.username } });
    if (accountExistUsername) throw new ApiError("Username=" + account.username + " is already used", 400);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(account.password, salt);
    const parsedAccount: Account = { ...account, id: userId, password: hashedPassword };

    const createdAccount = await getPrismaClient().account.create({
      data: { ...parsedAccount },
    });
    createdAccount.password = undefined;
    return createdAccount;
  }

  static async signIn(username: string, password: string) {
    const account = await getPrismaClient().account.findUnique({ where: { username } });

    if (!account) throw new ApiError(`Account with username=${username} not found`, 404);

    const validPassword = await bcrypt.compare(password, account.password);
    if (!validPassword) throw new ApiError(`Bad password`, 400);
    const token = jwt.sign({ id: account.id, username: account.username }, process.env.JWT_SECRET, { expiresIn: "10h" });
    account.password = undefined;
    return { token, account: account };
  }

  static async getOneById(accountId: string) {
    return await getPrismaClient().account.findUnique({ where: { id: accountId } });
  }
}
