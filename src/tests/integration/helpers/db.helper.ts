import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v4 } from "uuid";

export const createTestAccount = async (prisma: PrismaClient) => {
  return prisma.account.create({
    data: {
      id: v4(),
      email: `test-${v4()}@test.com`,
      password: await bcrypt.hash("password123", 10),
    },
  });
};

export const cleanDatabase = async (prisma: PrismaClient) => {
  await prisma.transaction.deleteMany();
  await prisma.label.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.account.deleteMany();
};
