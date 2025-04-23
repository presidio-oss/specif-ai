DROP INDEX `masterSolutions_solutionPath_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `masterSolutions_name_unique` ON `masterSolutions` (`name`);--> statement-breakpoint
ALTER TABLE `masterSolutions` DROP COLUMN `solutionPath`;