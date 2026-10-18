CREATE TABLE `access_users` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`companies` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	CONSTRAINT "access_role" CHECK("access_users"."role" IN ('Owner','Administrator','Leadership','Finance','Sales','Operations','Marketing','Viewer','Office display')),
	CONSTRAINT "access_enabled" CHECK("access_users"."enabled" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_users_user_id_unique` ON `access_users` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `access_users_email_unique` ON `access_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `access_single_owner` ON `access_users` (`role`) WHERE "access_users"."role"='Owner';--> statement-breakpoint
CREATE TABLE `request_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `operations` ADD `actor` text;--> statement-breakpoint
ALTER TABLE `operations` ADD `request_hash` text;