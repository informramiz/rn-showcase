CREATE TABLE `bookmarks` (
	`story_id` integer PRIMARY KEY NOT NULL,
	`saved_at` integer NOT NULL,
	`known_descendants` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookmarks_saved_at_idx` ON `bookmarks` (`saved_at`);--> statement-breakpoint
CREATE TABLE `dismissed` (
	`story_id` integer PRIMARY KEY NOT NULL,
	`dismissed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feeds` (
	`feed` text PRIMARY KEY NOT NULL,
	`ids` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `history` (
	`story_id` integer PRIMARY KEY NOT NULL,
	`read_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `history_read_at_idx` ON `history` (`read_at`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY NOT NULL,
	`type` text,
	`by` text,
	`time` integer,
	`title` text,
	`url` text,
	`text` text,
	`score` integer,
	`descendants` integer,
	`kids` text,
	`parent` integer,
	`deleted` integer,
	`dead` integer,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` integer NOT NULL,
	`body` text NOT NULL,
	`highlight` text,
	`tags` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notes_story_idx` ON `notes` (`story_id`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`entity_id` text PRIMARY KEY NOT NULL,
	`op` text NOT NULL,
	`base_version` integer NOT NULL,
	`revision` integer NOT NULL,
	`attempts` integer NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`status` text NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL
);
