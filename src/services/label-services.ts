import { Label as RestLabel } from "@clients";

import { getPrismaClient } from "@/configs";
import { BadRequestError, NotFoundError } from "@/errors";
import { LabelMapper } from "@/mappers";
import { ListFilters, NameFilter } from "@/types";
import { createLogger } from "@/utilities/logger";

const logger = createLogger("LabelServices");
const db = () => getPrismaClient();

export class LabelServices {
  static async create(accountId: string, label: RestLabel) {
    logger.info(`Creating label name=${label.name} for account=${accountId}`);

    const existing = await db().label.findFirst({
      where: { name: label.name, accountId, isArchived: false },
    });
    if (existing) throw new BadRequestError(`Label with name=${label.name} already exists`);

    return db().label.create({ data: LabelMapper.create(accountId, label) });
  }

  static async update(accountId: string, label: RestLabel) {
    logger.info(`Updating label id=${label.id} for account=${accountId}`);

    const existing = await db().label.findFirst({ where: { id: label.id, accountId } });
    if (!existing || existing.isArchived) throw new NotFoundError(`Label with id=${label.id} not found`);

    const nameConflict = await db().label.findFirst({
      where: { name: label.name, accountId, id: { not: label.id }, isArchived: false },
    });
    if (nameConflict) throw new BadRequestError(`Label with name=${label.name} already exists`);

    return db().label.update({
      data: LabelMapper.update(accountId, label),
      where: { id: label.id, accountId },
    });
  }

  static async getOneById(accountId: string, id: string) {
    logger.info(`Fetching label id=${id} for account=${accountId}`);

    const label = await db().label.findFirst({ where: { id, accountId, isArchived: false } });
    if (!label) throw new NotFoundError(`Label with id=${id} not found`);

    return label;
  }

  static async archiveOneById(accountId: string, id: string) {
    logger.info(`Archiving label id=${id} for account=${accountId}`);

    const label = await db().label.findFirst({ where: { id, accountId, isArchived: false } });
    if (!label) throw new NotFoundError(`Label with id=${id} not found`);

    return db().label.update({
      data: { isArchived: true },
      where: { id, accountId },
    });
  }

  static async getAll(accountId: string, query: ListFilters & NameFilter) {
    const { page, pageSize, name } = query;
    logger.info(`Fetching all labels for account=${accountId} page=${page}`);

    const where = {
      accountId,
      isArchived: false,
      ...(name ? { name: { contains: name } } : {}),
    };

    const [values, count] = await db().$transaction([db().label.findMany({ take: pageSize, skip: pageSize * (page - 1), where }), db().label.count({ where })]);

    return { values, count };
  }
}
