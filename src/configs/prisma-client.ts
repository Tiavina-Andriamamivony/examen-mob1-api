import { PrismaClient } from "@prisma/client";

let prismaClient: PrismaClient | undefined;

export const getPrismaClient = () => {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return prismaClient;
};

export const resetPrismaClient = () => {
  prismaClient = undefined;
};
