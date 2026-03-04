import { CreationLabel, Label as RestLabel } from "@clients";
import z from "zod";

import { BadRequestError, ForbiddenError } from "@/errors";
import { LabelServices } from "@/services";

const createLabelSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  iconRef: z.string().optional(),
});

const updateLabelSchema = createLabelSchema;

const parseOrThrow = (schema: z.ZodSchema, data: unknown): void => {
  const result = schema.safeParse(data);
  if (!result.success) throw new BadRequestError(z.prettifyError(result.error));
};

export class LabelValidator {
  static create(body: CreationLabel): void {
    parseOrThrow(createLabelSchema, body);
  }

  static update(accountId: string, body: RestLabel): void {
    if (body.id === undefined) throw new BadRequestError("Label id is required for update");
    parseOrThrow(updateLabelSchema, body);
  }

  static async list(accountId: string, labels: RestLabel[]): Promise<{ id: string }[]> {
    if (!labels?.length) throw new BadRequestError("At least one label is required");

    const results = await Promise.all(
      labels
        .filter((l): l is RestLabel & { id: string } => !!l.id)
        .map(async ({ id }) => {
          const label = await LabelServices.getOneById(accountId, id).catch(() => null);
          return { id, label };
        }),
    );

    const missing = results.filter(({ label }) => !label).map(({ id }) => id);
    if (missing.length > 0) throw new BadRequestError(`Labels not found: ${missing.join(", ")}`);

    return results.map(({ label }) => ({ id: label!.id }));
  }
}
