import { RequestHandler } from "express";
import * as jwt from "jsonwebtoken";

import { UnauthorizedError, ForbiddenError } from "@/errors";

export const securityHandler: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or malformed authorization header"));
  }

  const token = authHeader.split(" ")[1];
  const { accountId } = req.params as Record<string, string>;
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return next(new UnauthorizedError("Server misconfiguration: missing JWT secret"));
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) return next(new UnauthorizedError("Invalid or expired token"));

    const decodedAccount = decoded as Record<string, any>;

    if (!decodedAccount?.id) {
      return next(new UnauthorizedError("Malformed token payload"));
    }

    if (accountId && accountId !== decodedAccount.id) {
      return next(new ForbiddenError("You are not allowed to access this resource"));
    }

    (req as any).account = decodedAccount;
    next();
  });
};