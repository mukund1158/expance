-- AlterTable
ALTER TABLE `spaces` ADD COLUMN `inviteToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `spaces_inviteToken_key` ON `spaces`(`inviteToken`);
