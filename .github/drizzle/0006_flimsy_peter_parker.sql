CREATE TABLE `finance_import_files` (
	`batch_id` text NOT NULL,
	`filename` text NOT NULL,
	`sha256` text NOT NULL,
	`bytes` integer NOT NULL,
	`object_key` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `finance_import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_import_file_key` ON `finance_import_files` (`batch_id`,`filename`);--> statement-breakpoint
CREATE TABLE `finance_import_revisions` (
	`batch_id` text PRIMARY KEY NOT NULL,
	`replaces_batch_id` text,
	`metadata` text NOT NULL,
	`created` text NOT NULL,
	`actor` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `finance_import_batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`replaces_batch_id`) REFERENCES `finance_import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_import_one_revision` ON `finance_import_revisions` (`replaces_batch_id`);