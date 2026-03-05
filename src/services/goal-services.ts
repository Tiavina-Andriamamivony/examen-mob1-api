import { Goal as RestGoal } from "@clients";
import { Goal as GoalPrisma } from "@prisma/client";

import { getPrismaClient } from "@/configs";
import { BadRequestError, NotFoundError } from "@/errors";
import { GoalMapper } from "@/mappers";
import { GoalFilters } from "@/types";
import { filterIfNotNull, filterIfNotNullDate, filterIfNotNullNumber } from "@/utilities";
import { createLogger } from "@/utilities/logger";

const log = createLogger("GoalServices");
const db = () => getPrismaClient();

export class GoalServices {
  static async create(accountId: string, walletId: string, goal: GoalPrisma) {
    log.info(`Creating goal name=${goal.name} for account=${accountId} wallet=${walletId}`);

    const existing = await db().goal.findFirst({
      where: { name: goal.name, accountId, isArchived: false, walletId },
    });

    if (existing) throw new BadRequestError(`Goal with name=${goal.name} already exists`);

    return db().goal.create({ data: goal });
  }

  static async update(accountId: string, walletId: string, goal: RestGoal) {
    log.info(`Updating goal id=${goal.id} for account=${accountId}`);

    const existing = await db().goal.findFirst({
      where: { id: goal.id, accountId, walletId, isArchived: false },
    });

    if (!existing) throw new NotFoundError(`Goal with id=${goal.id} not found`);

    const nameConflict = await db().goal.findFirst({
      where: { name: goal.name, accountId, walletId, id: { not: goal.id }, isArchived: false },
    });

    if (nameConflict) throw new BadRequestError(`Goal with name=${goal.name} already exists`);

    return db().goal.update({
      data: GoalMapper.update(accountId, goal),
      where: { id: goal.id, accountId, walletId },
    });
  }

  static async getOneById(accountId: string, id: string) {
    log.info(`Fetching goal id=${id} for account=${accountId}`);

    const goal = await db().goal.findFirst({ where: { id, accountId, isArchived: false } });

    if (!goal) throw new NotFoundError(`Goal with id=${id} not found`);

    return goal;
  }

  static async archiveOneById(accountId: string, id: string) {
    log.info(`Archiving goal id=${id} for account=${accountId}`);

    const goal = await db().goal.findFirst({ where: { id, accountId, isArchived: false } });

    if (!goal) throw new NotFoundError(`Goal with id=${id} not found`);

    return db().goal.update({
      data: { isArchived: true },
      where: { id, accountId },
    });
  }

  static async getAll(accountId: string, query: GoalFilters) {
    const {
      page,
      pageSize,
      name,
      walletId,
      startingDateBeginning,
      startingDateEnding,
      endingDateBeginning,
      endingDateEnding,
      sort = "desc",
      sortBy = "createdAt",
      maxAmount,
      minAmount,
    } = query;

    log.info(`Fetching all goals for account=${accountId} page=${page}`);

    const where = {
      accountId,
      isArchived: false,
      ...filterIfNotNull("walletId", walletId),
      ...(name ? { name: { contains: name } } : {}),
      startingDate: {
        ...filterIfNotNullDate("gte", startingDateBeginning),
        ...filterIfNotNullDate("lte", startingDateEnding),
      },
      endingDate: {
        ...filterIfNotNullDate("gte", endingDateBeginning),
        ...filterIfNotNullDate("lte", endingDateEnding),
      },
      amount: {
        ...filterIfNotNullNumber("gte", minAmount),
        ...filterIfNotNullNumber("lte", maxAmount),
      },
    };

    const [values, count] = await db().$transaction([
      db().goal.findMany({
        take: pageSize,
        skip: pageSize * (page - 1),
        where,
        orderBy: { [sortBy]: sort },
      }),
      db().goal.count({ where }),
    ]);

    return { values, count };
  }
}
