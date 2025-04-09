ALTER TABLE `BusinessFlow` RENAME TO `BusinessProcess`;--> statement-breakpoint
ALTER TABLE `BusinessFlow_Documents` RENAME TO `BusinessProcessDocuments`;--> statement-breakpoint
ALTER TABLE `BusinessProcessDocuments` RENAME COLUMN "business_flow_id" TO "business_process_id";--> statement-breakpoint
ALTER TABLE `Metadata` RENAME COLUMN "tech_stacks" TO "technical_details";--> statement-breakpoint
ALTER TABLE `BusinessProcess` ADD `is_deleted` integer DEFAULT false;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_BusinessProcessDocuments` (
	`business_process_id` integer NOT NULL,
	`document_id` integer NOT NULL,
	`doc_type` text NOT NULL,
	PRIMARY KEY(`business_process_id`, `document_id`, `doc_type`),
	FOREIGN KEY (`business_process_id`) REFERENCES `BusinessProcess`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `Document`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_BusinessProcessDocuments`("business_process_id", "document_id", "doc_type") SELECT "business_process_id", "document_id", "doc_type" FROM `BusinessProcessDocuments`;--> statement-breakpoint
DROP TABLE `BusinessProcessDocuments`;--> statement-breakpoint
ALTER TABLE `__new_BusinessProcessDocuments` RENAME TO `BusinessProcessDocuments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `Metadata` ADD `is_deleted` integer DEFAULT false;--> statement-breakpoint
CREATE TABLE `__new_Document` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`jira_id` text,
	`document_type_id` text NOT NULL,
	`count` integer DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`is_deleted` integer DEFAULT false,
	FOREIGN KEY (`document_type_id`) REFERENCES `DocumentType`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_Document`("id", "name", "description", "jira_id", "document_type_id", "count", "created_at", "updated_at", "is_deleted") SELECT "id", "name", "description", "jira_id", "document_type_id", "count", "created_at", "updated_at", "is_deleted" FROM `Document`;--> statement-breakpoint
DROP TABLE `Document`;--> statement-breakpoint
ALTER TABLE `__new_Document` RENAME TO `Document`;--> statement-breakpoint
ALTER TABLE `AnalyticsLookup` ADD `is_deleted` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `Conversation` ADD `is_deleted` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `DocumentType` ADD `is_deleted` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `Integration` ADD `is_deleted` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `Message` ADD `role` text NOT NULL;--> statement-breakpoint
ALTER TABLE `Message` ADD `is_deleted` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `Message` DROP COLUMN `external_message_id`;