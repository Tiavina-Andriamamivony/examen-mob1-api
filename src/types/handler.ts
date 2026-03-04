import { Request, Response } from "express";

export type HandlerContext = {
  req: Request;
  res: Response;
  accountId: string;
};