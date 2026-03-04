import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { securityHandler } from "@/middlewares/security-middleware";
import { UnauthorizedError, ForbiddenError } from "@/errors";

vi.mock("jsonwebtoken", () => ({
  verify: vi.fn(),
}));

const VALID_ACCOUNT_ID = "account-123";
const VALID_SECRET = "test-secret";
const VALID_TOKEN = "valid.jwt.token";

const makeReq = (overrides: Record<string, any> = {}): Request => {
  const base = {
    headers: { authorization: `Bearer ${VALID_TOKEN}` },
    params: { accountId: VALID_ACCOUNT_ID },
  };
  return { ...base, ...overrides } as unknown as Request;
};

const makeRes = (): Response => ({} as Response);
const makeNext = (): NextFunction => vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  process.env.JWT_SECRET = VALID_SECRET;
});

describe("securityHandler", () => {
  describe("Authorization header validation", () => {
    it("should call next with UnauthorizedError when Authorization header is missing", () => {
      const req = makeReq({ headers: {} });
      const next = makeNext();

      securityHandler(req, makeRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((next as any).mock.calls[0][0].status).toBe(401);
    });

    it("should call next with UnauthorizedError when Authorization header does not start with Bearer", () => {
      const req = makeReq({ headers: { authorization: `Basic ${VALID_TOKEN}` } });
      const next = makeNext();

      securityHandler(req, makeRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("should call next with UnauthorizedError when Authorization header is empty string", () => {
      const req = makeReq({ headers: { authorization: "" } });
      const next = makeNext();

      securityHandler(req, makeRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe("JWT_SECRET validation", () => {
    it("should call next with UnauthorizedError when JWT_SECRET is not set", () => {
      delete process.env.JWT_SECRET;
      const next = makeNext();

      securityHandler(makeReq(), makeRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((next as any).mock.calls[0][0].message).toContain("misconfiguration");
    });
  });

  describe("Token verification", () => {
    it("should call next with UnauthorizedError when token is invalid", () => {
      vi.mocked(jwt.verify).mockImplementation((_token, _secret, callback: any) => {
        callback(new Error("invalid token"), undefined);
      });

      const next = makeNext();
      securityHandler(makeReq(), makeRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("should call next with UnauthorizedError when token is expired", () => {
      vi.mocked(jwt.verify).mockImplementation((_token, _secret, callback: any) => {
        callback(new Error("jwt expired"), undefined);
      });

      const next = makeNext();
      securityHandler(makeReq(), makeRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("should call next with UnauthorizedError when decoded token has no id", () => {
      vi.mocked(jwt.verify).mockImplementation((_token, _secret, callback: any) => {
        callback(null, { email: "test@test.com" }); // no id field
      });

      const next = makeNext();
      securityHandler(makeReq(), makeRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe("Account ID validation", () => {
    it("should call next with ForbiddenError when accountId in params does not match token", () => {
      vi.mocked(jwt.verify).mockImplementation((_token, _secret, callback: any) => {
        callback(null, { id: "different-account-id" });
      });

      const next = makeNext();
      securityHandler(makeReq(), makeRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect((next as any).mock.calls[0][0].status).toBe(403);
    });

    it("should pass when route has no accountId in params", () => {
      vi.mocked(jwt.verify).mockImplementation((_token, _secret, callback: any) => {
        callback(null, { id: VALID_ACCOUNT_ID });
      });

      const req = makeReq({ params: {} }); // no accountId
      const next = makeNext();

      securityHandler(req, makeRes(), next);

      expect(next).toHaveBeenCalledWith(); // called with no args = success
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("Success", () => {
    it("should call next with no args and set req.account when token is valid", () => {
      const decodedAccount = { id: VALID_ACCOUNT_ID, email: "test@test.com" };
      vi.mocked(jwt.verify).mockImplementation((_token, _secret, callback: any) => {
        callback(null, decodedAccount);
      });

      const req = makeReq();
      const next = makeNext();

      securityHandler(req, makeRes(), next);

      expect(next).toHaveBeenCalledWith();
      expect((req as any).account).toEqual(decodedAccount);
    });

    it("should call jwt.verify with the correct token and secret", () => {
      vi.mocked(jwt.verify).mockImplementation((_token, _secret, callback: any) => {
        callback(null, { id: VALID_ACCOUNT_ID });
      });

      securityHandler(makeReq(), makeRes(), makeNext());

      expect(jwt.verify).toHaveBeenCalledWith(
        VALID_TOKEN,
        VALID_SECRET,
        expect.any(Function)
      );
    });
  });
});