/*
  Warnings:

  - A unique constraint covering the columns `[verification_token_hash]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "verification_sent_at" TIMESTAMP(3),
ADD COLUMN     "verification_token_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_verification_token_hash_key" ON "users"("verification_token_hash");
