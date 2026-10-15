ALTER TABLE `generation` ADD `allow_gallery` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `generation`
SET `allow_gallery` = true
WHERE NOT EXISTS (
  SELECT 1
  FROM `subscription`
  WHERE `subscription`.`user_id` = `generation`.`user_id`
);
--> statement-breakpoint
ALTER TABLE `asset_item` ADD `source_type` text DEFAULT 'generated' NOT NULL;
--> statement-breakpoint
UPDATE `asset_item`
SET `source_type` = 'uploaded'
WHERE `type` = 'character'
  AND EXISTS (
    SELECT 1
    FROM `asset_file`
    WHERE `asset_file`.`item_id` = `asset_item`.`id`
      AND `asset_file`.`is_active_reference` = true
      AND `asset_file`.`generation_id` IS NULL
      AND `asset_file`.`deleted_at` IS NULL
  );
--> statement-breakpoint
CREATE TABLE `gallery_item` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`item_id` text,
	`animation_clip_id` text,
	`animation_version_id` text,
	`preview_file_id` text,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`width` integer,
	`height` integer,
	`size_bytes` integer,
	`prompt` text,
	`download_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`source_created_at` text NOT NULL,
	`published_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `asset_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`animation_clip_id`) REFERENCES `animation_clip`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`animation_version_id`) REFERENCES `animation_version`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`preview_file_id`) REFERENCES `asset_file`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_gallery_character_source` ON `gallery_item` (`item_id`) WHERE `type` = 'character';
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_gallery_animation_source` ON `gallery_item` (`animation_clip_id`) WHERE `type` = 'animation';
--> statement-breakpoint
CREATE INDEX `idx_gallery_status_type_created` ON `gallery_item` (`status`,`type`,`source_created_at`);
--> statement-breakpoint
CREATE INDEX `idx_gallery_status_type_likes` ON `gallery_item` (`status`,`type`,`like_count`);
--> statement-breakpoint
CREATE INDEX `idx_gallery_status_type_downloads` ON `gallery_item` (`status`,`type`,`download_count`);
--> statement-breakpoint
CREATE TABLE `gallery_like` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_item_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`gallery_item_id`) REFERENCES `gallery_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_gallery_like_item_user` ON `gallery_like` (`gallery_item_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_gallery_like_user` ON `gallery_like` (`user_id`);
--> statement-breakpoint
CREATE TRIGGER `gallery_like_after_insert`
AFTER INSERT ON `gallery_like`
BEGIN
	UPDATE `gallery_item`
	SET `like_count` = `like_count` + 1,
		`updated_at` = strftime('%Y-%m-%dT%H:%M:%fZ','now')
	WHERE `id` = NEW.`gallery_item_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `gallery_like_after_delete`
AFTER DELETE ON `gallery_like`
BEGIN
	UPDATE `gallery_item`
	SET `like_count` = MAX(0, `like_count` - 1),
		`updated_at` = strftime('%Y-%m-%dT%H:%M:%fZ','now')
	WHERE `id` = OLD.`gallery_item_id`;
END;
