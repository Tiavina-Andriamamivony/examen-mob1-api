import { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error.status || 500;
  console.error(`[${new Date().toISOString()}] Error ${statusCode}: ${error.message}`);
  res.status(statusCode).json({
    code: error.status,
    message: error.message || "Internal Server Error",
  });
};
