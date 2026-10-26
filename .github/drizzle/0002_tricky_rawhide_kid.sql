CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`record_id` text NOT NULL,
	`actor` text NOT NULL,
	`provider` text NOT NULL,
	`intent` text NOT NULL,
	`status` text NOT NULL,
	`units` integer NOT NULL,
	`day_key` text NOT NULL,
	`request_spec` text NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`failure` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_runs_company_day` ON `ai_runs` (`company`,`day_key`);