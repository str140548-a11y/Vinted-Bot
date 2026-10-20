CREATE TABLE `checkout_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`price_at_start` real NOT NULL,
	`total_at_start` real,
	`delivery_point_name` text,
	`inspection_started_at` integer,
	`inspection_duration_sec` integer,
	`status` text DEFAULT 'inspecting' NOT NULL,
	`launched_at` integer,
	`decided_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `checkout_sessions_status_idx` ON `checkout_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `checkout_sessions_listing_idx` ON `checkout_sessions` (`listing_id`);