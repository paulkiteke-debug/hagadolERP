ALTER TABLE `records` ADD `document_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `records_document_code` ON `records` (`company`,`document_code`);