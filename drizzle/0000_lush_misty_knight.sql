CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`vinted_id` text NOT NULL,
	`title` text NOT NULL,
	`price` real NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`service_fee` real,
	`shipping_fee` real,
	`total_cost` real,
	`brand` text,
	`size` text,
	`condition` text,
	`image_url` text,
	`url` text NOT NULL,
	`seller_name` text,
	`seller_rating` real,
	`source` text DEFAULT 'mock' NOT NULL,
	`match_reason` text,
	`availability` text DEFAULT 'available' NOT NULL,
	`availability_checked_at` integer,
	`first_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`saved_search_id` text,
	FOREIGN KEY (`saved_search_id`) REFERENCES `saved_searches`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listings_vinted_id_unique` ON `listings` (`vinted_id`);--> statement-breakpoint
CREATE INDEX `listings_search_idx` ON `listings` (`saved_search_id`);--> statement-breakpoint
CREATE INDEX `listings_first_seen_idx` ON `listings` (`first_seen_at`);--> statement-breakpoint
CREATE INDEX `listings_avail_idx` ON `listings` (`availability`);--> statement-breakpoint
CREATE TABLE `log_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`scope` text DEFAULT 'app' NOT NULL,
	`message` text NOT NULL,
	`meta` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `log_entries_created_idx` ON `log_entries` (`created_at`);--> statement-breakpoint
CREATE INDEX `log_entries_level_idx` ON `log_entries` (`level`);--> statement-breakpoint
CREATE TABLE `monitor_health` (
	`id` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	`running` integer DEFAULT false NOT NULL,
	`last_run_at` integer,
	`last_success_at` integer,
	`last_error_at` integer,
	`last_error` text,
	`consecutive_errors` integer DEFAULT 0 NOT NULL,
	`total_checks` integer DEFAULT 0 NOT NULL,
	`total_matches` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text,
	`saved_search_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`priority` integer DEFAULT false NOT NULL,
	`channel` text DEFAULT 'in_app' NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`error` text,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`saved_search_id`) REFERENCES `saved_searches`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `notifications_created_idx` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_read_idx` ON `notifications` (`read`);--> statement-breakpoint
CREATE TABLE `pickup_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`provider` text,
	`address` text,
	`postcode` text,
	`distance_km` real,
	`priority` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pickup_locations_priority_idx` ON `pickup_locations` (`priority`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`price` real NOT NULL,
	`recorded_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `price_history_listing_idx` ON `price_history` (`listing_id`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`recorded_price` real NOT NULL,
	`recorded_fees` real,
	`recorded_total` real,
	`delivery_point_name` text,
	`status` text DEFAULT 'intended' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_listing_id_unique` ON `purchases` (`listing_id`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE TABLE `review_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`price_at_start` real NOT NULL,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	`duration_sec` integer DEFAULT 900 NOT NULL,
	`status` text DEFAULT 'reviewing' NOT NULL,
	`decided_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `review_windows_status_idx` ON `review_windows` (`status`);--> statement-breakpoint
CREATE INDEX `review_windows_expires_idx` ON `review_windows` (`expires_at`);--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`keywords` text,
	`brand` text,
	`category` text,
	`size` text,
	`condition` text,
	`min_price` real,
	`max_price` real,
	`max_total_cost` real,
	`preferred_brands` text DEFAULT '[]' NOT NULL,
	`excluded_brands` text DEFAULT '[]' NOT NULL,
	`excluded_keywords` text DEFAULT '[]' NOT NULL,
	`min_seller_rating` real,
	`max_seller_rating` real,
	`new_listings_only` integer DEFAULT true NOT NULL,
	`alert_price_drops` integer DEFAULT false NOT NULL,
	`notify` integer DEFAULT true NOT NULL,
	`priority_deal_pct` real,
	`raw_params` text DEFAULT '{}' NOT NULL,
	`last_checked_at` integer,
	`last_status` text,
	`last_error` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `saved_searches_active_idx` ON `saved_searches` (`active`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	`quiet_hours_start` text,
	`quiet_hours_end` text,
	`notification_sound` integer DEFAULT true NOT NULL,
	`group_notifications` integer DEFAULT false NOT NULL,
	`web_push_enabled` integer DEFAULT true NOT NULL,
	`telegram_enabled` integer DEFAULT false NOT NULL,
	`telegram_bot_token` text,
	`telegram_chat_id` text,
	`default_max_price` real,
	`max_total_spend` real,
	`review_window_sec` integer DEFAULT 900 NOT NULL,
	`quick_buy_enabled` integer DEFAULT false NOT NULL,
	`require_confirm` integer DEFAULT true NOT NULL,
	`poll_interval_sec` integer DEFAULT 60 NOT NULL,
	`data_retention_days` integer DEFAULT 30 NOT NULL,
	`adapter` text DEFAULT 'mock' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
