import { CreationProject, CreationProjectTransaction, ProjectStatistics } from "@clients";
import { Project as PrismaProject, ProjectTransaction as PrismaProjectTransaction } from "@prisma/client";

import { getPrismaClient } from "@/configs";
import { BadRequestError, NotFoundError } from "@/errors";
import { ProjectMapper } from "@/mappers";
import { ProjectFilters } from "@/types";
import { filterIfNotNull } from "@/utilities";
import { createLogger } from "@/utilities/logger";

const log = createLogger("ProjectServices");
const db = () => getPrismaClient();

export class ProjectServices {
  static async create(accountId: string, project: CreationProject): Promise<PrismaProject> {
    log.info(`Creating project name=${project.name} for account=${accountId}`);

    if (!project.name) throw new BadRequestError("Project name is required");
    if (project.initialBudget === undefined) throw new BadRequestError("Initial budget is required");

    return db().project.create({
      data: {
        name: project.name,
        description: project.description ?? null,
        initialBudget: project.initialBudget,
        color: project.color ?? "#00ff00",
        iconRef: project.iconRef ?? null,
        accountId,
      },
    });
  }

  static async getOneById(accountId: string, projectId: string): Promise<PrismaProject> {
    log.info(`Fetching project id=${projectId} for account=${accountId}`);

    const project = await db().project.findFirst({
      where: { id: projectId, accountId, isArchived: false },
    });

    if (!project) throw new NotFoundError(`Project with id=${projectId} not found`);

    return project;
  }

  static async update(accountId: string, projectId: string, project: Partial<CreationProject>): Promise<PrismaProject> {
    log.info(`Updating project id=${projectId} for account=${accountId}`);

    const existing = await this.getOneById(accountId, projectId);

    return db().project.update({
      where: { id: projectId, accountId },
      data: {
        name: project.name ?? existing.name,
        description: project.description !== undefined ? project.description : existing.description,
        initialBudget: project.initialBudget ?? existing.initialBudget,
        color: project.color ?? existing.color,
        iconRef: project.iconRef !== undefined ? project.iconRef : existing.iconRef,
      },
    });
  }

  static async archiveOneById(accountId: string, projectId: string): Promise<PrismaProject> {
    log.info(`Archiving project id=${projectId} for account=${accountId}`);

    await this.getOneById(accountId, projectId);

    return db().project.update({
      where: { id: projectId, accountId },
      data: { isArchived: true },
    });
  }

  static async deleteOneById(accountId: string, projectId: string): Promise<PrismaProject> {
    log.info(`Deleting project id=${projectId} for account=${accountId}`);

    await this.getOneById(accountId, projectId);

    return db().project.delete({ where: { id: projectId, accountId } });
  }

  static async getAll(accountId: string, query: ProjectFilters) {
    const { page, pageSize, name, isArchived = false, sort = "desc", sortBy = "createdAt" } = query;
    log.info(`Fetching all projects for account=${accountId} page=${page}`);

    const where = {
      accountId,
      isArchived,
      ...(name ? { name: { contains: name } } : {}),
    };

    const [values, count] = await db().$transaction([
      db().project.findMany({
        take: pageSize,
        skip: pageSize * (page - 1),
        where,
        orderBy: { [sortBy]: sort },
      }),
      db().project.count({ where }),
    ]);

    return { values, count };
  }

  static async createTransaction(accountId: string, projectId: string, transaction: CreationProjectTransaction): Promise<PrismaProjectTransaction> {
    log.info(`Creating transaction for project=${projectId} account=${accountId}`);

    await this.getOneById(accountId, projectId);

    if (!transaction.name) throw new BadRequestError("Transaction name is required");
    if (transaction.estimatedCost === undefined) throw new BadRequestError("Estimated cost is required");

    return db().projectTransaction.create({
      data: {
        name: transaction.name,
        description: transaction.description ?? null,
        estimatedCost: transaction.estimatedCost,
        realCost: transaction.realCost ?? 0,
        projectId,
        accountId,
      },
    });
  }

  static async getTransactionById(accountId: string, projectId: string, transactionId: string): Promise<PrismaProjectTransaction> {
    log.info(`Fetching transaction id=${transactionId} for project=${projectId}`);

    const transaction = await db().projectTransaction.findFirst({
      where: { id: transactionId, projectId, accountId },
    });

    if (!transaction) throw new NotFoundError(`Transaction with id=${transactionId} not found`);
    return transaction;
  }

  static async updateTransaction(accountId: string, projectId: string, transactionId: string, transaction: Partial<CreationProjectTransaction>): Promise<PrismaProjectTransaction> {
    log.info(`Updating transaction id=${transactionId} for project=${projectId}`);

    const existing = await this.getTransactionById(accountId, projectId, transactionId);

    return db().projectTransaction.update({
      where: { id: transactionId },
      data: {
        name: transaction.name ?? existing.name,
        description: transaction.description !== undefined ? transaction.description : existing.description,
        estimatedCost: transaction.estimatedCost ?? existing.estimatedCost,
        realCost: transaction.realCost !== undefined ? transaction.realCost : existing.realCost,
      },
    });
  }

  static async deleteTransaction(accountId: string, projectId: string, transactionId: string): Promise<PrismaProjectTransaction> {
    log.info(`Deleting transaction id=${transactionId} for project=${projectId}`);

    await this.getTransactionById(accountId, projectId, transactionId);

    return db().projectTransaction.delete({ where: { id: transactionId } });
  }

  static async getTransactionsByProject(accountId: string, projectId: string): Promise<PrismaProjectTransaction[]> {
    log.info(`Fetching all transactions for project=${projectId}`);

    await this.getOneById(accountId, projectId);

    return db().projectTransaction.findMany({
      where: { projectId, accountId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getStatistics(accountId: string, projectId: string): Promise<ProjectStatistics> {
    log.info(`Computing statistics for project=${projectId}`);

    const prismaProject = await this.getOneById(accountId, projectId);
    const transactions = await this.getTransactionsByProject(accountId, projectId);

    const totalEstimatedCost = transactions.reduce((sum, t) => sum + t.estimatedCost, 0);
    const totalRealCost = transactions.reduce((sum, t) => sum + (t.realCost ?? 0), 0);
    const remainingBudget = prismaProject.initialBudget - totalRealCost;

    const project = ProjectMapper.toRest(prismaProject);

    return {
      project,
      totalEstimatedCost,
      totalRealCost,
      remainingBudget,
      transactionCount: transactions.length,
    };
  }
}
