CREATE TABLE `finance_import_postings` (
	`id` text PRIMARY KEY NOT NULL,
	`import_id` text NOT NULL,
	`row_key` text NOT NULL,
	`company` text NOT NULL,
	`economic_key` text NOT NULL,
	`record_id` text NOT NULL,
	`posted_at` text NOT NULL,
	FOREIGN KEY (`import_id`) REFERENCES `finance_import_batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_posting_source_row` ON `finance_import_postings` (`import_id`,`row_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `finance_posting_economic_key` ON `finance_import_postings` (`company`,`economic_key`);--> statement-breakpoint
CREATE TABLE `finance_import_reviews` (
	`import_id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text NOT NULL,
	`decisions` text NOT NULL,
	`review_hash` text NOT NULL,
	`prepared_by` text NOT NULL,
	`prepared_at` text NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`approval_note` text,
	`result` text,
	FOREIGN KEY (`import_id`) REFERENCES `finance_import_batches`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "finance_review_status" CHECK("finance_import_reviews"."status" IN ('Prepared','Posted'))
);
