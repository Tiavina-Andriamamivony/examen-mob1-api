import { WalletMapper } from "@/mappers";
import { WalletServices } from "@/services";
import { getValuesFromQuery } from "@/utilities";
import { handler } from "@/utilities/handler";
import { createLogger } from "@/utilities/logger";
import { WalletValidator } from "@/validator";

const log = createLogger("WalletController");

export class WalletController {
  static readonly create = handler(async ({ req, accountId }) => {
    log.info(`Creating wallet for account=${accountId}`);

    WalletValidator.create(req.body);
    const data = await WalletServices.create(accountId, req.body);

    return WalletMapper.toRest(data);
  });

  static readonly update = handler(async ({ req, accountId }) => {
    const { walletId } = req.params as Record<string, string>;
    log.info(`Updating wallet=${walletId} for account=${accountId}`);

    WalletValidator.update(accountId, req.body);
    const data = await WalletServices.update(accountId, { ...req.body, id: walletId });

    return WalletMapper.toRest(data);
  });

  static readonly updateAutomaticIncome = handler(async ({ req, accountId }) => {
    const { walletId } = req.params as Record<string, string>;
    log.info(`Updating automatic income for wallet=${walletId} account=${accountId}`);

    WalletValidator.updateAutomaticIncome(req.body);
    const data = await WalletServices.updateAutomaticIncome(accountId, walletId, req.body);

    return WalletMapper.toRest(data);
  });

  static readonly getOne = handler(async ({ req, accountId }) => {
    const { walletId } = req.params as Record<string, string>;
    log.info(`Fetching wallet=${walletId} for account=${accountId}`);

    const data = await WalletServices.getOneById(accountId, walletId);

    return WalletMapper.toRest(data);
  });

  static readonly archiveOne = handler(async ({ req, accountId }) => {
    const { walletId } = req.params as Record<string, string>;
    log.info(`Archiving wallet=${walletId} for account=${accountId}`);

    const data = await WalletServices.archiveOneById(accountId, walletId);

    return WalletMapper.toRest(data);
  });

  static readonly getAll = handler(async ({ req, accountId }) => {
    const { page, pageSize } = req as any;
    const { isActive, name, walletType } = req.query as any;
    log.info(`Fetching all wallets for account=${accountId}`);

    WalletValidator.getAll({ walletType });
    const data = await WalletServices.getAll(accountId, {
      page,
      pageSize,
      isActive: getValuesFromQuery.boolean("isActive", isActive),
      name,
      walletType,
    });

    return WalletMapper.toListResponse(data.values, { page, pageSize, elementCount: data.count });
  });
}
