import { GetAllGoals200Response, Goal as RestGoal } from "@clients";
import { Goal as PrismaGoal } from "@prisma/client";
import { v4 } from "uuid";

import { PrismaPaginationInfo } from "@/types";
import { DEFAULT_COLOR, calculatePagination } from "@/utilities";

export class GoalMapper {
  static toRest(goal: PrismaGoal): RestGoal {
    return {
      id: goal.id,
      name: goal.name,
      amount: goal.amount,
      endingDate: goal.endingDate,
      startingDate: goal.startingDate,
      walletId: goal.walletId ?? undefined,
      accountId: goal.accountId,
      color: goal.color || DEFAULT_COLOR,
      iconRef: goal.iconRef ?? undefined,
    };
  }

  static update(accountId: string, goal: RestGoal): PrismaGoal {
    return {
      accountId,
      amount: goal.amount ?? 0,
      color: goal.color || DEFAULT_COLOR,
      endingDate: new Date(goal.endingDate as unknown as string),
      startingDate: new Date(goal.startingDate as unknown as string),
      id: goal.id ?? v4(),
      name: goal.name ?? "",
      walletId: goal.walletId ?? null,
      iconRef: goal.iconRef ?? null,
      isArchived: false,
      updatedAt: new Date(),
      // createdAt is omitted — Prisma uses @default(now()) on create, @updatedAt on update
    } as PrismaGoal;
  }

  static create(accountId: string, goal: RestGoal): PrismaGoal {
    return {
      ...GoalMapper.update(accountId, goal),
      id: v4(),
      createdAt: new Date(),
    } as PrismaGoal;
  }

  static toListResponse(goals: PrismaGoal[], prismaPaginationInfo: PrismaPaginationInfo): GetAllGoals200Response {
    return {
      pagination: calculatePagination(prismaPaginationInfo),
      values: goals.map(GoalMapper.toRest),
    };
  }
}
