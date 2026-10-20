CREATE TABLE `expo_push_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`platform` text DEFAULT 'android' NOT NULL,
	`device_name` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expo_push_tokens_token_unique` ON `expo_push_tokens` (`token`);