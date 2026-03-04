import { TransactionMapper } from "@/mappers";
import { TransactionServices } from "@/services";
import { handler } from "@/utilities/handler";
import { createLogger } from "@/utilities/logger";
import { TransactionValidator } from "@/validator";

const log = createLogger("TransactionController");

export class TransactionController {
  static readonly create = handler(async ({ req, accountId }) => {
    const { walletId } = req.params as Record<string, string>;
    log.info(`Creating transaction for wallet=${walletId} account=${accountId}`);

    TransactionValidator.create(req.body);
    const mapped = TransactionMapper.create(accountId, walletId, req.body);
    const data = await TransactionServices.create(accountId, walletId, mapped, req.body.labels);

    return TransactionMapper.toRest(data as any);
  });

  static readonly update = handler(async ({ req, accountId }) => {
    const { walletId, transactionId } = req.params as Record<string, string>;
    log.info(`Updating transaction=${transactionId} account=${accountId}`);

    TransactionValidator.update(accountId, req.body);
    const mapped = TransactionMapper.update(accountId, walletId, req.body);
    const data = await TransactionServices.update(accountId, walletId, transactionId, mapped, req.body.labels);

    return TransactionMapper.toRest(data as any);
  });

  static readonly getOne = handler(async ({ req, accountId }) => {
    const { walletId, transactionId } = req.params as Record<string, string>;
    log.info(`Fetching transaction=${transactionId} account=${accountId}`);

    const data = await TransactionServices.getOneById(accountId, walletId, transactionId);

    return TransactionMapper.toRest(data as any);
  });

  static readonly deleteOne = handler(async ({ req, accountId }) => {
    const { walletId, transactionId } = req.params as Record<string, string>;
    log.info(`Deleting transaction=${transactionId} account=${accountId}`);

    const data = await TransactionServices.deleteOneById(accountId, walletId, transactionId);

    return TransactionMapper.toRest(data as any);
  });

  static readonly getAll = handler(async ({ req, accountId }) => {
    const { page, pageSize } = req as any;
    log.info(`Fetching all transactions for account=${accountId}`);

    TransactionValidator.filters(req.query as any);
    const data = await TransactionServices.getAll(accountId, { page, pageSize, ...req.query });

    return data.values.map((t) => TransactionMapper.toRest(t as any));
  });
}
