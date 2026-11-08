CREATE TABLE `crm_csv_rows` (
	`session_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`source_id` text NOT NULL,
	`row_hash` text NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `crm_csv_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_csv_ordinal` ON `crm_csv_rows` (`session_id`,`ordinal`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_csv_source_id` ON `crm_csv_rows` (`session_id`,`source_id`);--> statement-breakpoint
CREATE TABLE `crm_csv_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`actor` text NOT NULL,
	`filename` text NOT NULL,
	`source_hash` text NOT NULL,
	`manifest_hash` text NOT NULL,
	`kind` text NOT NULL,
	`expected_rows` integer NOT NULL,
	`status` text DEFAULT 'Uploading' NOT NULL,
	`cursor` integer DEFAULT 0 NOT NULL,
	`payload` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '{}' NOT NULL,
	`approved_by` text,
	`created` text NOT NULL,
	CONSTRAINT "crm_csv_row_limit" CHECK("crm_csv_sessions"."expected_rows" BETWEEN 1 AND 10000),
	CONSTRAINT "crm_csv_status" CHECK("crm_csv_sessions"."status" IN ('Uploading','Review','Approved','Complete'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_csv_company_source` ON `crm_csv_sessions` (`company`,`source_hash`);