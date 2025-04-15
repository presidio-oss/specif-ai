CREATE TABLE `MasterSolutions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`solution_path` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`is_deleted` integer DEFAULT false
);
--> statement-breakpoint
CREATE UNIQUE INDEX `MasterSolutions_solution_path_unique` ON `MasterSolutions` (`solution_path`);