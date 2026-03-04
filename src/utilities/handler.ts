import { NextFunction, Request, RequestHandler, Response } from "express";

import { HandlerContext } from "@/types/handler";

type HandlerFn = (context: HandlerContext) => Promise<unknown>;

export const handler =
  (fn: HandlerFn): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accountId = (req as any).account.id as string;
      const result = await fn({ req, res, accountId });
      if (result !== undefined) res.json(result);
    } catch (err) {
      next(err);
    }
  };
