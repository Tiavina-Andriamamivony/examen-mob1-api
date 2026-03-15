import { CreationWallet, UpdateWallet, WalletAutomaticIncome } from "@clients";

import { getPrismaClient } from "@/configs";
import { BadRequestError, NotFoundError } from "@/errors";
import { WalletMapper } from "@/mappers";
import { ListFilters, NameFilter, WalletFilter } from "@/types";
import { filterIfNotNull } from "@/utilities";
import { createLogger } from "@/utilities/logger";

const log = createLogger("WalletService");

const db = () => getPrismaClient();

export class WalletServices {
  static async create(accountId: string, wallet: CreationWallet) {
    log.info(`Creating wallet name=${wallet.name} for account=${accountId}`);
    log.info(`Wallet details:`, { wallet });

    // Check if account exists
    log.info(`Checking if account exists: ${accountId}`);
    const accountExists = await db().account.findUnique({ where: { id: accountId } });
    if (!accountExists) {
      log.error(`Account not found: ${accountId}`);
      throw new NotFoundError(`Account with id=${accountId} not found`);
    }
    log.info(`Account exists:`, accountExists);

    // Check for duplicate wallet name
    log.info(`Checking for duplicate wallet name: ${wallet.name} for account: ${accountId}`);
    const existing = await db().wallet.findFirst({ where: { name: wallet.name, accountId } });
    if (existing) {
      log.error(`Wallet with name already exists: ${wallet.name} for account: ${accountId}`);
      throw new BadRequestError(`Wallet with name=${wallet.name} already exists`);
    }
    log.info(`No duplicate wallet found`);

    // Map wallet data
    log.info(`Mapping wallet data for Prisma`);
    const walletData = WalletMapper.create(accountId, wallet);
    log.info(`Mapped wallet data:`, walletData);

    // Create wallet
    log.info(`Creating wallet in database`);
    try {
      const result = await db().wallet.create({ data: walletData });
      log.info(`Wallet created successfully:`, result);
      return result;
    } catch (error) {
      log.error(`Failed to create wallet:`, error);
      throw error;
    }
  }

  static async update(accountId: string, wallet: UpdateWallet) {
    log.info(`Updating wallet id=${wallet.id} for account=${accountId}`);

    const existing = await db().wallet.findFirst({ where: { id: wallet.id, accountId } });

    if (!existing) throw new NotFoundError(`Wallet with id=${wallet.id} not found`);

    const nameConflict = await db().wallet.findFirst({
      where: { name: wallet.name, accountId, id: { not: wallet.id } },
    });

    if (nameConflict) throw new BadRequestError(`Wallet with name=${wallet.name} already exists`);

    return db().wallet.update({
      data: WalletMapper.update(accountId, wallet),
      where: { id: wallet.id, accountId },
    });
  }

  static async updateAutomaticIncome(accountId: string, walletId: string, automaticIncome: WalletAutomaticIncome) {
    log.info(`Updating automatic income for wallet=${walletId} account=${accountId}`);

    const existing = await db().wallet.findFirst({ where: { id: walletId, accountId } });

    if (!existing) throw new NotFoundError(`Wallet with id=${walletId} not found`);

    return db().wallet.update({
      data: {
        haveAutomaticIncome: automaticIncome.type === "MENSUAL",
        automaticIncomeAmount: automaticIncome.amount ?? 0,
        automaticIncomeDay: automaticIncome.paymentDay ?? 1,
      },
      where: { id: walletId, accountId },
    });
  }

  static async getOneById(accountId: string, id: string) {
    log.info(`Fetching wallet id=${id} for account=${accountId}`);

    const wallet = await db().wallet.findFirst({ where: { id, accountId, isArchived: false } });

    if (!wallet) throw new NotFoundError(`Wallet with id=${id} not found`);

    return wallet;
  }

  static async archiveOneById(accountId: string, id: string) {
    log.info(`Archiving wallet id=${id} for account=${accountId}`);

    const wallet = await db().wallet.findFirst({ where: { id, accountId, isArchived: false } });

    if (!wallet) throw new NotFoundError(`Wallet with id=${id} not found`);

    return db().wallet.update({
      data: { isArchived: true },
      where: { id, accountId },
    });
  }

  static async getAll(accountId: string, query: ListFilters & NameFilter & WalletFilter) {
    const { page, pageSize, name, isActive, walletType } = query;
    log.info(`Fetching all wallets for account=${accountId} page=${page} pageSize=${pageSize}`);

    const where = {
      accountId,
      isArchived: false,
      ...(name ? { name: { contains: name } } : {}),
      ...filterIfNotNull("isActive", isActive),
      ...filterIfNotNull("type", walletType),
    };

    const [values, count] = await db().$transaction([db().wallet.findMany({ take: pageSize, skip: pageSize * (page - 1), where }), db().wallet.count({ where })]);

    return { values, count };
  }
}
