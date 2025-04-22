CREATE TABLE `analyticsLookup` (
	`id` integer PRIMARY KEY NOT NULL,
	`targetType` text NOT NULL,
	`targetId` text NOT NULL,
	`isLiked` integer DEFAULT false,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`isDeleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auditTracker` (
	`id` integer PRIMARY KEY NOT NULL,
	`auditType` text,
	`docId` integer,
	`description` text,
	`context` text,
	`createdBy` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`isDeleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`docId`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `businessProcess` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`flowchart` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`isDeleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `businessProcessDocuments` (
	`id` integer PRIMARY KEY NOT NULL,
	`businessProcessId` integer NOT NULL,
	`documentId` integer NOT NULL,
	`docType` text NOT NULL,
	FOREIGN KEY (`businessProcessId`) REFERENCES `businessProcess`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`documentId`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `conversation` (
	`id` integer PRIMARY KEY NOT NULL,
	`documentId` integer NOT NULL,
	`title` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`isDeleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`documentId`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `document` (
	`id` integer PRIMARY KEY NOT NULL,
	`documentNumber` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`jiraId` text,
	`documentTypeId` integer,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`isDeleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`documentTypeId`) REFERENCES `documentType`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documentLinks` (
	`id` integer PRIMARY KEY NOT NULL,
	`sourceDocumentId` integer,
	`targetDocumentId` integer,
	`sourceDocumentType` text NOT NULL,
	`targetDocumentType` text NOT NULL,
	`createdBy` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`isDeleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`sourceDocumentId`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`targetDocumentId`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documentType` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`typeLabel` text NOT NULL,
	`isActive` integer DEFAULT true,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`isDeleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `integration` (
	`id` integer PRIMARY KEY NOT NULL,
	`config` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`isDeleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `message` (
	`id` integer PRIMARY KEY NOT NULL,
	`conversationId` integer NOT NULL,
	`message` text NOT NULL,
	`userType` text NOT NULL,
	`isApplied` integer DEFAULT false,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`isDeleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`technicalDetails` text NOT NULL,
	`isBrownfield` integer DEFAULT false,
	`version` text DEFAULT 'v1',
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`isDeleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE VIEW `DocumentCountByType` AS select "documentType"."id", "documentType"."name", "documentType"."typeLabel", count("document"."id") as "count" from "documentType" left join "document" on "document"."documentTypeId" = "documentType"."id" group by "documentType"."id";