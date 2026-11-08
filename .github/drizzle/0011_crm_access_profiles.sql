PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_access_users` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`crm_profile` text,
	`companies` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	CONSTRAINT "access_role" CHECK("__new_access_users"."role" IN ('Owner','Administrator','Leadership','Finance','Sales','Operations','Marketing','Viewer','Office display')),
	CONSTRAINT "access_enabled" CHECK("__new_access_users"."enabled" IN (0,1)),
	CONSTRAINT "access_crm_profile" CHECK("__new_access_users"."crm_profile" IS NULL OR ("__new_access_users"."role"='Sales' AND "__new_access_users"."crm_profile" IN ('sales_rep','sales_manager','field_ops')))
);
--> statement-breakpoint
INSERT INTO `__new_access_users`("id", "user_id", "email", "role", "crm_profile", "companies", "enabled", "created", "updated") SELECT "id", "user_id", "email", "role", NULL, "companies", "enabled", "created", "updated" FROM `access_users`;--> statement-breakpoint
DROP TABLE `access_users`;--> statement-breakpoint
ALTER TABLE `__new_access_users` RENAME TO `access_users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `access_users_user_id_unique` ON `access_users` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `access_users_email_unique` ON `access_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `access_single_owner` ON `access_users` (`role`) WHERE "access_users"."role"='Owner';
