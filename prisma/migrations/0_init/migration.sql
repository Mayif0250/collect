-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CSE_COLLECTOR', 'ECE_COLLECTOR');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('CSE', 'ECE', 'ALL');

-- CreateEnum
CREATE TYPE "Block" AS ENUM ('E', 'F');

-- CreateEnum
CREATE TYPE "Batch" AS ENUM ('O23', 'O21');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('PRIMARY', 'BACKUP', 'CROSS_BLOCK');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'RELEASED', 'REASSIGNED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permittedDepartment" "Department" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "block" "Block" NOT NULL,
    "name" TEXT NOT NULL,
    "roomOrder" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomClaim" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'ACTIVE',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "reassignedToCollectorId" TEXT,
    "auditAdminId" TEXT,

    CONSTRAINT "RoomClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaptopRecord" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT,
    "branch" "Department" NOT NULL,
    "batch" "Batch" NOT NULL,
    "isSubmitterPresent" BOOLEAN NOT NULL DEFAULT true,
    "submitterStudentId" TEXT,
    "primaryBlock" "Block" NOT NULL,
    "allocationStatus" "AllocationStatus" NOT NULL DEFAULT 'PRIMARY',
    "roomId" TEXT,
    "seatNumber" INTEGER,
    "collectorId" TEXT NOT NULL,
    "isDuplicateOverride" BOOLEAN NOT NULL DEFAULT false,
    "duplicateReason" TEXT,
    "idempotencyKey" TEXT,
    "crossBlockTransferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaptopRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossBlockTransfer" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "sourceDept" "Department" NOT NULL,
    "destinationBlock" "Block" NOT NULL,
    "laptopCount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrossBlockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionSession" (
    "id" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL DEFAULT 'College Laptop Collection',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "initializedBy" TEXT,
    "activatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "responseJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Room_name_key" ON "Room"("name");
CREATE INDEX "Room_block_roomOrder_idx" ON "Room"("block", "roomOrder");

-- CreateIndex
CREATE INDEX "RoomClaim_roomId_status_idx" ON "RoomClaim"("roomId", "status");
CREATE INDEX "RoomClaim_collectorId_status_idx" ON "RoomClaim"("collectorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LaptopRecord_collectionId_key" ON "LaptopRecord"("collectionId");
CREATE UNIQUE INDEX "LaptopRecord_idempotencyKey_key" ON "LaptopRecord"("idempotencyKey");
CREATE INDEX "LaptopRecord_studentId_idx" ON "LaptopRecord"("studentId");
CREATE INDEX "LaptopRecord_branch_allocationStatus_idx" ON "LaptopRecord"("branch", "allocationStatus");
CREATE INDEX "LaptopRecord_roomId_idx" ON "LaptopRecord"("roomId");
CREATE INDEX "LaptopRecord_collectorId_idx" ON "LaptopRecord"("collectorId");
CREATE UNIQUE INDEX "LaptopRecord_roomId_seatNumber_key" ON "LaptopRecord"("roomId", "seatNumber");

-- CreateIndex
CREATE INDEX "CrossBlockTransfer_createdAt_idx" ON "CrossBlockTransfer"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");
CREATE INDEX "IdempotencyRecord_key_idx" ON "IdempotencyRecord"("key");

-- AddForeignKey
ALTER TABLE "RoomClaim" ADD CONSTRAINT "RoomClaim_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoomClaim" ADD CONSTRAINT "RoomClaim_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoomClaim" ADD CONSTRAINT "RoomClaim_reassignedToCollectorId_fkey" FOREIGN KEY ("reassignedToCollectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaptopRecord" ADD CONSTRAINT "LaptopRecord_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LaptopRecord" ADD CONSTRAINT "LaptopRecord_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaptopRecord" ADD CONSTRAINT "LaptopRecord_crossBlockTransferId_fkey" FOREIGN KEY ("crossBlockTransferId") REFERENCES "CrossBlockTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossBlockTransfer" ADD CONSTRAINT "CrossBlockTransfer_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
