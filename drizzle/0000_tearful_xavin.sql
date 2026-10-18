CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`record` text NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`source` text NOT NULL,
	`account` text NOT NULL,
	`debit` integer DEFAULT 0 NOT NULL,
	`credit` integer DEFAULT 0 NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_source_account` ON `journal` (`source`,`account`);--> statement-breakpoint
CREATE INDEX `journal_company_date` ON `journal` (`company`,`date`);--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`paid` integer DEFAULT 0 NOT NULL,
	`date` text NOT NULL,
	`due` text DEFAULT '' NOT NULL,
	`payload` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `records_company_type` ON `records` (`company`,`type`);