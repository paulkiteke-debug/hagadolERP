CREATE TABLE `finance_import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`source_hash` text NOT NULL,
	`filename` text NOT NULL,
	`expected_rows` integer NOT NULL,
	`manifest_hash` text NOT NULL,
	`status` text DEFAULT 'Uploading' NOT NULL,
	`created` text NOT NULL,
	`completed` text,
	`actor` text NOT NULL,
	CONSTRAINT "finance_import_status" CHECK("finance_import_batches"."status" IN ('Uploading','Review'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_import_batches_source_hash_unique` ON `finance_import_batches` (`source_hash`);--> statement-breakpoint
CREATE TABLE `finance_import_rows` (
	`batch_id` text NOT NULL,
	`row_key` text NOT NULL,
	`company` text NOT NULL,
	`source_sheet` text NOT NULL,
	`source_cell` text NOT NULL,
	`payload` text NOT NULL,
	`row_hash` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `finance_import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_import_row_key` ON `finance_import_rows` (`batch_id`,`row_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `finance_import_source_cell` ON `finance_import_rows` (`batch_id`,`source_sheet`,`source_cell`);--> statement-breakpoint
CREATE INDEX `finance_import_company` ON `finance_import_rows` (`batch_id`,`company`);