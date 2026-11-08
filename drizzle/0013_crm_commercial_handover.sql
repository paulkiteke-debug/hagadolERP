ALTER TABLE `records` ADD `source_deal_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `records_source_deal` ON `records` (`company`,`source_deal_id`);