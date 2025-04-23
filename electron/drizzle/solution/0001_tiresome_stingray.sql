CREATE UNIQUE INDEX `metadata_name_unique` ON `metadata` (`name`);--> statement-breakpoint
ALTER TABLE `metadata` DROP COLUMN `version`;