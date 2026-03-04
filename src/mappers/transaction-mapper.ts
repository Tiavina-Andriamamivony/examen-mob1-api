import { CreationTransaction, Transaction as RestTransaction } from "@clients";
import { Label as PrismaLabel, Transaction as PrismaTransaction } from "@prisma/client";
import { v4 } from "uuid";

import { LabelMapper } from "./label-mapper";

type PrismaTransactionWithLabels = PrismaTransaction & { labels: PrismaLabel[] };

export class TransactionMapper {
  static toRest(transaction: PrismaTransactionWithLabels): RestTransaction {
    return {
      id: transaction.id,
      accountId: transaction.accountId,
      walletId: transaction.walletId,
      amount: transaction.amount,
      date: transaction.date,
      description: transaction.description ?? undefined,
      type: transaction.type as RestTransaction["type"],
      labels: transaction.labels.map(LabelMapper.toRest),
    };
  }

  static create(accountId: string, walletId: string, transaction: CreationTransaction): PrismaTransaction {
    return {
      id: v4(),
      accountId,
      walletId,
      amount: transaction.amount ?? 0,
      date: new Date(transaction.date as unknown as string),
      description: transaction.description ?? null,
      type: transaction.type ?? "IN",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as PrismaTransaction;
  }

  static update(accountId: string, walletId: string, transaction: RestTransaction): PrismaTransaction {
    return {
      id: transaction.id,
      accountId,
      walletId,
      amount: transaction.amount ?? 0,
      date: new Date(transaction.date as unknown as string),
      description: transaction.description ?? null,
      type: transaction.type ?? "IN",
      updatedAt: new Date(),
    } as PrismaTransaction;
  }
}
