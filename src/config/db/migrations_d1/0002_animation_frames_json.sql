-- Store ordered animation frame metadata on animation_version.
-- Existing animation_frame rows are intentionally not migrated.
ALTER TABLE `animation_version` ADD `spritesheet_file_id` text REFERENCES asset_file(id) ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `animation_version` ADD `frames_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_animation_version_spritesheet_file` ON `animation_version` (`spritesheet_file_id`);--> statement-breakpoint
DROP TABLE `animation_frame`;
