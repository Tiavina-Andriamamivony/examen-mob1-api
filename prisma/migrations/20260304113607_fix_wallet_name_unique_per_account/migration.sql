/*
  Warnings:

  - A unique constraint covering the columns `[name,accountId]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Wallet_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_name_accountId_key" ON "Wallet"("name", "accountId");

-- RedefineIndex
DROP INDEX "Account_username_key";
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
