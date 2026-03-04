import { GetAllLabels200Response, Label as RestLabel } from "@clients";
import { Label as PrismaLabel } from "@prisma/client";
import { v4 } from "uuid";

import { PrismaPaginationInfo } from "@/types";
import { DEFAULT_COLOR, calculatePagination } from "@/utilities";

export class LabelMapper {
  static toRest(label: PrismaLabel): RestLabel {
    return {
      id: label.id,
      name: label.name,
      color: label.color ?? DEFAULT_COLOR,
      iconRef: label.iconRef ?? undefined,
    };
  }

  static create(accountId: string, label: RestLabel): PrismaLabel {
    return {
      id: v4(),
      accountId,
      name: label.name ?? "",
      color: label.color ?? DEFAULT_COLOR,
      iconRef: label.iconRef ?? null,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as PrismaLabel;
  }

  static update(accountId: string, label: RestLabel): Partial<PrismaLabel> {
    return {
      accountId,
      name: label.name ?? "",
      color: label.color ?? DEFAULT_COLOR,
      iconRef: label.iconRef ?? null,
      updatedAt: new Date(),
    };
  }

  static toListResponse(labels: PrismaLabel[], pagination: PrismaPaginationInfo): GetAllLabels200Response {
    return {
      pagination: calculatePagination(pagination),
      values: labels.map(this.toRest.bind(this)),
    };
  }
}
