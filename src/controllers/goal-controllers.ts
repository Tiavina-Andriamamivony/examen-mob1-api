import { GoalMapper } from "@/mappers";
import { GoalServices } from "@/services";
import { handler } from "@/utilities/handler";
import { createLogger } from "@/utilities/logger";
import { GoalValidator } from "@/validator";

const log = createLogger("GoalController");

export class GoalController {
  static readonly create = handler(async ({ req, accountId }) => {
    const { walletId } = req.params as Record<string, string>;
    log.info(`Creating goal for wallet=${walletId} account=${accountId}`);

    await GoalValidator.create(accountId, walletId, req.body);
    const mapped = GoalMapper.create(accountId, req.body);
    const data = await GoalServices.create(accountId, walletId, mapped);

    return GoalMapper.toRest(data);
  });

  static readonly update = handler(async ({ req, accountId }) => {
    const { goalId, walletId } = req.params as Record<string, string>;
    log.info(`Updating goal=${goalId} for account=${accountId}`);

    GoalValidator.update(accountId, req.body);
    const data = await GoalServices.update(accountId, walletId, { ...req.body, id: goalId });

    return GoalMapper.toRest(data);
  });

  static readonly getOne = handler(async ({ req, accountId }) => {
    const { goalId } = req.params as Record<string, string>;
    log.info(`Fetching goal=${goalId} for account=${accountId}`);

    const data = await GoalServices.getOneById(accountId, goalId);

    return GoalMapper.toRest(data);
  });

  static readonly archiveOne = handler(async ({ req, accountId }) => {
    const { goalId } = req.params as Record<string, string>;
    log.info(`Archiving goal=${goalId} for account=${accountId}`);

    const data = await GoalServices.archiveOneById(accountId, goalId);

    return GoalMapper.toRest(data);
  });

  static readonly getAll = handler(async ({ req, accountId }) => {
    const { page, pageSize } = req as any;
    log.info(`Fetching all goals for account=${accountId}`);

    GoalValidator.filters(req.query as any);
    const data = await GoalServices.getAll(accountId, { ...req.query, page, pageSize });

    return GoalMapper.toListResponse(data.values, { page, pageSize, elementCount: data.count });
  });
}
