import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import { pong } from "@/controllers/ping-pong.controller";

describe("Ping endpoint", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.get("/ping", pong);
  });

  it("should return pong", async () => {
    const res = await request(app).get("/ping");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "pong!" });
  });
});
