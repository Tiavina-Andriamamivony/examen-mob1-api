import { RequestHandler } from "express";
import { v4 } from "uuid";

import { AccountServices } from "@/services";
import { errorWrapper } from "@/utilities";
import { AccountValidator } from "@/validator";

export class AccountController {
  static readonly signIn: RequestHandler = async (req, res, next) => {
    try {
      const { email, password } = req.body;
      AccountValidator.create({ email, password });
      const data = await AccountServices.signIn(email, password);
      res.json(data);
    } catch (err) {
      next(err);
    }
  };
  static readonly signUp: RequestHandler = async (req, res, next) => {
    try {
      const account = req.body;
      AccountValidator.create(account);
      const createdUser = await AccountServices.singUp(v4(), account);
      res.json(createdUser);
    } catch (err) {
      next(err);
    }
  };

  static readonly requestReset: RequestHandler = async (req, res, next) => {
    try {
      const { email } = req.body;
      AccountValidator.resetRequest({ email });
      const data = await AccountServices.requestPasswordReset(email);
      res.json(data);
    } catch (err) {
      next(err);
    }
  };

  static readonly confirmReset: RequestHandler = async (req, res, next) => {
    try {
      const { token, password } = req.body;
      AccountValidator.resetConfirm({ token, password });
      const data = await AccountServices.confirmPasswordReset(token, password);
      res.json(data);
    } catch (err) {
      next(err);
    }
  };
}
