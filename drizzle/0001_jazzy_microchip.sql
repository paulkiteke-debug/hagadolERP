CREATE TABLE `operations` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`result` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `records` ADD `credited` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `records` ADD `version` integer DEFAULT 0 NOT NULL;