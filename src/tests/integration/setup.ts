import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll } from "vitest";

import { resetPrismaClient } from "@/configs";

export let prisma: PrismaClient;

export const setupIntegrationTests = () => {
  beforeAll(async () => {
    resetPrismaClient();
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    resetPrismaClient();
  });
};
