import { CreationTransaction, Label, Transaction as RestTransaction } from "@clients";
import { Transaction as PrismaTransaction } from "@prisma/client";

import { getPrismaClient } from "@/configs";
import { NotFoundError } from "@/errors";
import { TransactionMapper } from "@/mappers";
import { TransactionFilters } from "@/types";
import { filterIfNotNull, filterIfNotNullDate, filterIfNotNullNumber } from "@/utilities";
import { createLogger } from "@/utilities/logger";
import { LabelValidator } from "@/validator";

import { WalletServices } from "./wallet-services";

const log = createLogger("TransactionServices");

const db = () => getPrismaClient();

const applyWalletAmountDelta = async (accountId: string, walletId: string, amount: number, type: string, delta: 1 | -1) => {
  const wallet = await WalletServices.getOneById(accountId, walletId);
  const change = amount * (type === "IN" ? 1 : -1) * delta;
  await db().wallet.update({
    data: { amount: wallet.amount + change },
    where: { id: walletId, accountId },
  });
};

const isDateInPastOrPresent = (date: Date): boolean => new Date(date).getTime() <= new Date().getTime();

export class TransactionServices {
  static async create(accountId: string, walletId: string, transaction: PrismaTransaction, labels: Label[]) {
    log.info(`Creating transaction for wallet=${walletId} account=${accountId}`);

    const mappedLabelIds = await LabelValidator.list(accountId, labels);

    if (isDateInPastOrPresent(transaction.date)) {
      await applyWalletAmountDelta(accountId, walletId, transaction.amount, transaction.type, 1);
    }

    return db().transaction.create({
      data: { ...transaction, labels: { connect: mappedLabelIds } },
      include: { labels: true },
    });
  }

  static async update(accountId: string, walletId: string, transactionId: string, transaction: PrismaTransaction, labels: Label[]) {
    log.info(`Updating transaction=${transactionId} for account=${accountId}`);

    const existing = await db().transaction.findFirst({
      where: { id: transactionId, accountId, walletId },
    });
    if (!existing) throw new NotFoundError(`Transaction with id=${transactionId} not found`);

    if (isDateInPastOrPresent(transaction.date)) {
      const amountChanged = transaction.amount !== existing.amount;
      const typeChanged = transaction.type !== existing.type;

      if (amountChanged || typeChanged) {
        await applyWalletAmountDelta(accountId, walletId, existing.amount, existing.type, -1);
        await applyWalletAmountDelta(accountId, walletId, transaction.amount, transaction.type, 1);
      }
    }

    const mappedLabelIds = await LabelValidator.list(accountId, labels);

    return db().transaction.update({
      data: { ...transaction, labels: { set: mappedLabelIds } },
      where: { id: transactionId, accountId, walletId },
      include: { labels: true },
    });
  }

  static async getOneById(accountId: string, walletId: string, transactionId: string) {
    log.info(`Fetching transaction=${transactionId} for account=${accountId}`);

    const transaction = await db().transaction.findFirst({
      where: { id: transactionId, walletId, accountId },
      include: { labels: true },
    });
    if (!transaction) throw new NotFoundError(`Transaction with id=${transactionId} not found`);

    return transaction;
  }

  static async deleteOneById(accountId: string, walletId: string, transactionId: string) {
    log.info(`Deleting transaction=${transactionId} for account=${accountId}`);

    const transaction = await db().transaction.findFirst({
      where: { id: transactionId, walletId, accountId },
      include: { labels: true },
    });
    if (!transaction) throw new NotFoundError(`Transaction with id=${transactionId} not found`);

    await applyWalletAmountDelta(accountId, walletId, transaction.amount, transaction.type, -1);

    await db().transaction.delete({ where: { id: transactionId, walletId, accountId } });

    return transaction;
  }

  static async getAll(accountId: string, query: TransactionFilters) {
    const { page, pageSize, walletId, endingDate, label, maxAmount, minAmount, sort = "desc", sortBy = "date", startingDate, type } = query;

    log.info(`Fetching all transactions for account=${accountId} page=${page}`);

    const where = {
      accountId,
      ...filterIfNotNull("walletId", walletId),
      ...filterIfNotNull("type", type),
      ...filterIfNotNull("labels", label, () => ({ some: { id: { in: label } } })),
      amount: {
        ...filterIfNotNullNumber("gte", minAmount),
        ...filterIfNotNullNumber("lte", maxAmount),
      },
      date: {
        ...filterIfNotNullDate("gte", startingDate),
        ...filterIfNotNullDate("lte", endingDate),
      },
    };

    const [values, count] = await db().$transaction([
      db().transaction.findMany({
        take: pageSize,
        skip: pageSize * (page - 1),
        where,
        orderBy: { [sortBy]: sort },
        include: { labels: true },
      }),
      db().transaction.count({ where }),
    ]);

    return { values, count };
  }
}
