/*
  Warnings:

  - A unique constraint covering the columns `[idempotency_key]` on the table `bills` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "bills_idempotency_key_key" ON "bills"("idempotency_key");
