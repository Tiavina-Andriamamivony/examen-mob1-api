import { GetAllWallets200Response, Wallet as RestWallet, WalletTypeEnum } from "@clients";
import { Wallet as PrismaWallet } from "@prisma/client";
import { v4 } from "uuid";

import { PrismaPaginationInfo } from "@/types";
import { calculatePagination } from "@/utilities";
import { createLogger } from "@/utilities/logger";

const log = createLogger("WalletMapper");

export class WalletMapper {
  static toRest(wallet: PrismaWallet): RestWallet {
    return {
      id: wallet.id,
      name: wallet.name,
      amount: wallet.amount,
      isActive: wallet.isActive,
      accountId: wallet.accountId,
      description: wallet.description ?? undefined,
      color: wallet.color,
      iconRef: wallet.iconRef ?? undefined,
      type: wallet.type as WalletTypeEnum,
      walletAutomaticIncome: {
        type: wallet.haveAutomaticIncome ? "MENSUAL" : "NOT_SPECIFIED",
        amount: wallet.automaticIncomeAmount ?? undefined,
        paymentDay: wallet.automaticIncomeDay ?? undefined,
      },
    };
  }

  static create(accountId: string, wallet: RestWallet): PrismaWallet {
    log.info(`Mapping wallet to Prisma format:`, { accountId, wallet });

    const result = {
      id: v4(),
      accountId,
      name: wallet.name ?? "",
      description: wallet.description ?? "",
      type: wallet.type ?? "CASH",
      amount: wallet.amount ?? 0,
      color: wallet.color ?? "#00ff00",
      iconRef: wallet.iconRef ?? null,
      isActive: true,
      isArchived: false,
      haveAutomaticIncome: false,
      automaticIncomeAmount: 0,
      automaticIncomeDay: 1,
      createdAt: new Date(),
    } as PrismaWallet;

    log.info(`Mapped wallet data:`, result);
    return result;
  }

  static update(accountId: string, wallet: RestWallet): Partial<PrismaWallet> {
    return {
      accountId,
      name: wallet.name,
      description: wallet.description ?? "",
      type: wallet.type,
      color: wallet.color ?? "#00ff00",
      iconRef: wallet.iconRef ?? null,
      isActive: wallet.isActive,
    };
  }

  static toListResponse(wallets: PrismaWallet[], pagination: PrismaPaginationInfo): GetAllWallets200Response {
    return {
      pagination: calculatePagination(pagination),
      values: wallets.map(this.toRest.bind(this)),
    };
  }
}
