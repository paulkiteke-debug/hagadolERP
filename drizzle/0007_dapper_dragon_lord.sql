CREATE TABLE `crm_import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`source_hash` text NOT NULL,
	`filename` text NOT NULL,
	`expected_rows` integer NOT NULL,
	`manifest_hash` text NOT NULL,
	`status` text NOT NULL,
	`archive_key` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`completed` text,
	`actor` text NOT NULL,
	CONSTRAINT "crm_import_status" CHECK("crm_import_batches"."status" IN ('Uploading','Complete'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_import_source_company` ON `crm_import_batches` (`company`,`source_hash`);--> statement-breakpoint
CREATE TABLE `crm_import_rows` (
	`batch_id` text NOT NULL,
	`source_id` text NOT NULL,
	`record_id` text NOT NULL,
	`row_hash` text NOT NULL,
	`source_payload` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `crm_import_batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_import_source_key` ON `crm_import_rows` (`batch_id`,`source_id`);