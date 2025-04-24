ALTER TABLE `conversation` DROP COLUMN `title`;--> statement-breakpoint
ALTER TABLE `documentLinks` DROP COLUMN `sourceDocumentType`;--> statement-breakpoint
ALTER TABLE `documentLinks` DROP COLUMN `targetDocumentType`;--> statement-breakpoint
ALTER TABLE `documentLinks` DROP COLUMN `createdBy`;--> statement-breakpoint
DROP VIEW `DocumentCountByType`;--> statement-breakpoint
CREATE VIEW `documentCountByType` AS select "documentType"."id", "documentType"."name", "documentType"."typeLabel", count("document"."id") as "count" from "documentType" left join "document" on "document"."documentTypeId" = "documentType"."id" group by "documentType"."id";