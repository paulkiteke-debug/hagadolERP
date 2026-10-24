CREATE TABLE `crm_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`crm_company_id` text,
	`contact_id` text,
	`deal_id` text,
	`kind` text NOT NULL,
	`description` text NOT NULL,
	`outcome` text DEFAULT '' NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	`due_at` text,
	`actor` text NOT NULL,
	FOREIGN KEY (`crm_company_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deal_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "crm_activity_company" CHECK("crm_activities"."company" IN ('WMK','Hagadol')),
	CONSTRAINT "crm_activity_kind" CHECK("crm_activities"."kind" IN ('Call','Email','Meeting','Note','Task Reminder')),
	CONSTRAINT "crm_activity_link" CHECK("crm_activities"."crm_company_id" IS NOT NULL OR "crm_activities"."contact_id" IS NOT NULL OR "crm_activities"."deal_id" IS NOT NULL),
	CONSTRAINT "crm_activity_description" CHECK(length(trim("crm_activities"."description")) BETWEEN 1 AND 10000)
);
--> statement-breakpoint
CREATE INDEX `crm_activities_deal_time` ON `crm_activities` (`company`,`deal_id`,`occurred_at`,`id`);--> statement-breakpoint
CREATE INDEX `crm_activities_contact_time` ON `crm_activities` (`company`,`contact_id`,`occurred_at`,`id`);--> statement-breakpoint
CREATE INDEX `crm_activities_customer_time` ON `crm_activities` (`company`,`crm_company_id`,`occurred_at`,`id`);