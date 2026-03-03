import * as express from "express";

import { AccountController } from "@/controllers";

export const authRouter = express.Router();

authRouter.post("/sign-up", AccountController.signUp);
authRouter.post("/sign-in", AccountController.signIn);
authRouter.post("/reset-password", AccountController.requestReset);
authRouter.post("/reset-password/confirm", AccountController.confirmReset);
