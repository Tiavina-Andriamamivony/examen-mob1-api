import { LabelMapper } from "@/mappers";
import { LabelServices } from "@/services";
import { handler } from "@/utilities/handler";
import { createLogger } from "@/utilities/logger";
import { LabelValidator } from "@/validator";

const log = createLogger("LabelController");

export class LabelController {
  static readonly create = handler(async ({ req, accountId }) => {
    log.info(`Creating label for account=${accountId}`);

    LabelValidator.create(req.body);
    const data = await LabelServices.create(accountId, req.body);

    return LabelMapper.toRest(data);
  });

  static readonly update = handler(async ({ req, accountId }) => {
    const { labelId } = req.params as Record<string, string>;
    log.info(`Updating label=${labelId} for account=${accountId}`);

    LabelValidator.update(accountId, req.body);
    const data = await LabelServices.update(accountId, { ...req.body, id: labelId });

    return LabelMapper.toRest(data);
  });

  static readonly getOne = handler(async ({ req, accountId }) => {
    const { labelId } = req.params as Record<string, string>;
    log.info(`Fetching label=${labelId} for account=${accountId}`);

    const data = await LabelServices.getOneById(accountId, labelId);

    return LabelMapper.toRest(data);
  });

  static readonly archiveOne = handler(async ({ req, accountId }) => {
    const { labelId } = req.params as Record<string, string>;
    log.info(`Archiving label=${labelId} for account=${accountId}`);

    const data = await LabelServices.archiveOneById(accountId, labelId);

    return LabelMapper.toRest(data);
  });

  static readonly getAll = handler(async ({ req, accountId }) => {
    const { page, pageSize } = req as any;
    log.info(`Fetching all labels for account=${accountId}`);

    const data = await LabelServices.getAll(accountId, { ...req.query, page, pageSize });

    return LabelMapper.toListResponse(data.values, { page, pageSize, elementCount: data.count });
  });
}
