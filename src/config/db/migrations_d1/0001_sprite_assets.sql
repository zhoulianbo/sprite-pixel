-- SpritePixel domain migration v2
-- Apply AFTER: 0000_free_zombie.sql
-- Target: SQLite / Cloudflare D1
--
-- Ownership model:
--   user -> project
--   project -> asset_item / generation
--   generation.user_id records the user who initiated an AI operation.
--   Child asset/animation tables do NOT duplicate user_id; ownership is inherited
--   through project_id / item_id relationships.
--
-- Existing framework tables reused:
--   user, ai_task, credit, order, subscription, etc.
--
-- Time fields use readable ISO-8601 UTC TEXT values, e.g. 2026-09-14T23:15:30.123Z.
-- This migration ADDS SpritePixel business tables and patches framework
-- columns required by the current SQLite schema. It does not drop or
-- recreate framework tables.

PRAGMA foreign_keys = ON;

-- =========================================================
-- 0. FRAMEWORK PATCH
-- credit.balance_after exists in schema.sqlite.ts / 0001 snapshot,
-- but was not created by 0000_free_zombie.sql.
-- =========================================================
ALTER TABLE `credit` ADD `balance_after` integer;
--> statement-breakpoint

-- =========================================================
-- 1. PROJECT
-- Top-level game project owned by one user.
-- =========================================================
CREATE TABLE `project` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL,

    `name` text NOT NULL,
    `description` text,

    -- action_rpg, roguelike, platformer, casual, strategy...
    `game_genre` text DEFAULT '' NOT NULL,

    -- pixel_art, anime, cartoon, hand_painted, low_poly...
    `art_style` text DEFAULT '' NOT NULL,

    `palette_json` text,
    `negative_prompt` text,
    `settings_json` text DEFAULT '{}' NOT NULL,

    `status` text DEFAULT 'active' NOT NULL,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `deleted_at` text,

    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX `idx_project_user_status_updated`
ON `project` (`user_id`,`status`,`updated_at`);
--> statement-breakpoint


-- =========================================================
-- 2. ASSET ITEM
-- Logical game asset, NOT a physical file.
--
-- type examples:
-- character, sprite, prop, weapon, effect,
-- ui_screen, ui_element, map, tileset, environment,
-- icon, audio, music, sfx
--
-- parent_item_id supports composite assets:
-- Battle HUD -> Health Bar / Skill Button / Avatar
-- Forest Map -> Tree / Building / Decoration / Tileset
-- =========================================================
CREATE TABLE `asset_item` (
    `id` text PRIMARY KEY NOT NULL,
    `project_id` text NOT NULL,
    `parent_item_id` text,

    `type` text NOT NULL,
    `name` text NOT NULL,
    `description` text,

    `favorite` integer DEFAULT false NOT NULL,
    `sort_order` integer DEFAULT 0 NOT NULL,

    `settings_json` text DEFAULT '{}' NOT NULL,
    `status` text DEFAULT 'active' NOT NULL,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `deleted_at` text,

    FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`parent_item_id`) REFERENCES `asset_item`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

CREATE INDEX `idx_asset_item_project_type_status`
ON `asset_item` (`project_id`,`type`,`status`);
--> statement-breakpoint

CREATE INDEX `idx_asset_item_parent_sort`
ON `asset_item` (`parent_item_id`,`sort_order`);
--> statement-breakpoint

CREATE INDEX `idx_asset_item_project_updated`
ON `asset_item` (`project_id`,`updated_at`);
--> statement-breakpoint


-- =========================================================
-- 3. ASSET VARIANT
-- Variant / outfit / skin / state of one asset_item.
--
-- Examples:
-- Hero -> Original / Winter Outfit / Battle Armor
-- Sword -> Normal / Fire / Ice
-- =========================================================
CREATE TABLE `asset_variant` (
    `id` text PRIMARY KEY NOT NULL,
    `project_id` text NOT NULL,
    `item_id` text NOT NULL,

    `name` text NOT NULL,

    -- base, outfit, skin, style, state, custom
    `variant_type` text DEFAULT 'base' NOT NULL,

    `prompt` text,

    `sort_order` integer DEFAULT 0 NOT NULL,
    `status` text DEFAULT 'active' NOT NULL,
    `metadata_json` text DEFAULT '{}' NOT NULL,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `deleted_at` text,

    FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`item_id`) REFERENCES `asset_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX `idx_asset_variant_item_status_sort`
ON `asset_variant` (`item_id`,`status`,`sort_order`);
--> statement-breakpoint

CREATE INDEX `idx_asset_variant_project_type`
ON `asset_variant` (`project_id`,`variant_type`);
--> statement-breakpoint


-- =========================================================
-- 4. GENERATION
-- One logical AI operation initiated by a user.
--
-- generation.user_id is intentionally retained because it represents
-- the actor who started the operation and is used for credits/auditing.
--
-- One generation may map to multiple ai_task rows.
--
-- task_type examples:
-- create_character, edit_character, generate_pose, generate_portrait,
-- generate_outfit, generate_animation, edit_animation, generate_iso_set,
-- generate_prop, generate_weapon, generate_effect, generate_ui,
-- generate_audio, magic_fix
-- =========================================================
CREATE TABLE `generation` (
    `id` text PRIMARY KEY NOT NULL,

    `user_id` text NOT NULL,
    `project_id` text NOT NULL,

    `item_id` text,
    `variant_id` text,

    `task_type` text NOT NULL,

    `prompt` text,
    `negative_prompt` text,
    `params_json` text DEFAULT '{}' NOT NULL,

    `status` text DEFAULT 'pending' NOT NULL,

    `credits_cost` integer DEFAULT 0 NOT NULL,
    `provider_cost_micros` integer DEFAULT 0 NOT NULL,

    `failure_code` text,
    `failure_reason` text,

    `started_at` text,
    `completed_at` text,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,

    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`item_id`) REFERENCES `asset_item`(`id`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (`variant_id`) REFERENCES `asset_variant`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

CREATE INDEX `idx_generation_project_task_status`
ON `generation` (`project_id`,`task_type`,`status`);
--> statement-breakpoint

CREATE INDEX `idx_generation_user_created`
ON `generation` (`user_id`,`created_at`);
--> statement-breakpoint

CREATE INDEX `idx_generation_item_created`
ON `generation` (`item_id`,`created_at`);
--> statement-breakpoint


-- =========================================================
-- 5. GENERATION TASK
-- Links one logical SpritePixel generation to existing framework ai_task rows.
--
-- role examples:
-- primary, candidate, direction, frame, edit, cleanup, retry, fallback
-- =========================================================
CREATE TABLE `generation_task` (
    `id` text PRIMARY KEY NOT NULL,
    `generation_id` text NOT NULL,
    `ai_task_id` text NOT NULL,

    `role` text DEFAULT 'primary' NOT NULL,
    `sort_order` integer DEFAULT 0 NOT NULL,
    `metadata_json` text DEFAULT '{}' NOT NULL,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,

    FOREIGN KEY (`generation_id`) REFERENCES `generation`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`ai_task_id`) REFERENCES `ai_task`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE UNIQUE INDEX `idx_generation_task_ai_task`
ON `generation_task` (`ai_task_id`);
--> statement-breakpoint

CREATE INDEX `idx_generation_task_generation_sort`
ON `generation_task` (`generation_id`,`sort_order`);
--> statement-breakpoint


-- =========================================================
-- 6. ASSET FILE
-- Physical file / media object.
--
-- media_type:
-- image, audio, video, json
--
-- role examples:
-- source, reference, base_reference, portrait, pose, frame,
-- preview, spritesheet, icon, ui, effect, sound, music, mask, atlas
--
-- is_active_reference supports "Set as Base Reference".
-- =========================================================
CREATE TABLE `asset_file` (
    `id` text PRIMARY KEY NOT NULL,
    `project_id` text NOT NULL,

    `item_id` text,
    `variant_id` text,
    `generation_id` text,
    `generation_task_id` text,

    -- Derived-from relationship:
    -- cleaned file -> original file
    -- edited frame -> prior frame
    `parent_file_id` text,

    `media_type` text NOT NULL,
    `role` text NOT NULL,

    -- Prefer R2/object-storage keys rather than expiring signed URLs.
    `storage_key` text NOT NULL,
    `thumbnail_key` text,

    `original_filename` text,
    `mime_type` text,

    `width` integer,
    `height` integer,
    `duration_ms` integer,
    `size_bytes` integer,

    `is_active_reference` integer DEFAULT false NOT NULL,

    `status` text DEFAULT 'ready' NOT NULL,
    `metadata_json` text DEFAULT '{}' NOT NULL,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `deleted_at` text,

    FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`item_id`) REFERENCES `asset_item`(`id`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (`variant_id`) REFERENCES `asset_variant`(`id`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (`generation_id`) REFERENCES `generation`(`id`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (`generation_task_id`) REFERENCES `generation_task`(`id`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (`parent_file_id`) REFERENCES `asset_file`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

CREATE INDEX `idx_asset_file_project_media_role`
ON `asset_file` (`project_id`,`media_type`,`role`);
--> statement-breakpoint

CREATE INDEX `idx_asset_file_item_role_created`
ON `asset_file` (`item_id`,`role`,`created_at`);
--> statement-breakpoint

CREATE INDEX `idx_asset_file_variant_role_created`
ON `asset_file` (`variant_id`,`role`,`created_at`);
--> statement-breakpoint

CREATE INDEX `idx_asset_file_generation`
ON `asset_file` (`generation_id`);
--> statement-breakpoint

CREATE INDEX `idx_asset_file_generation_task`
ON `asset_file` (`generation_task_id`);
--> statement-breakpoint

CREATE INDEX `idx_asset_file_parent`
ON `asset_file` (`parent_file_id`);
--> statement-breakpoint

-- One currently active base/reference file per variant.
CREATE UNIQUE INDEX `idx_asset_file_variant_active_reference`
ON `asset_file` (`variant_id`)
WHERE `variant_id` IS NOT NULL
  AND `is_active_reference` = true
  AND `deleted_at` IS NULL;
--> statement-breakpoint


-- =========================================================
-- 7. PROJECT REFERENCE
-- Project-wide style / moodboard / palette / game references.
-- =========================================================
CREATE TABLE `project_reference` (
    `id` text PRIMARY KEY NOT NULL,
    `project_id` text NOT NULL,
    `file_id` text NOT NULL,

    -- style, moodboard, palette, character, game, audio...
    `reference_type` text NOT NULL,
    `label` text,

    `sort_order` integer DEFAULT 0 NOT NULL,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,

    FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`file_id`) REFERENCES `asset_file`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX `idx_project_reference_project_sort`
ON `project_reference` (`project_id`,`sort_order`);
--> statement-breakpoint

CREATE INDEX `idx_project_reference_file`
ON `project_reference` (`file_id`);
--> statement-breakpoint


-- =========================================================
-- 8. GENERATION INPUT
-- Files used as inputs/references for a generation.
--
-- generation_task_id:
-- null -> input applies to the whole logical generation
-- set  -> input was used by one particular ai_task/model call
--
-- role examples:
-- source, base_reference, style_reference, pose_reference,
-- motion_reference, previous_frame, next_frame, mask
-- =========================================================
CREATE TABLE `generation_input` (
    `id` text PRIMARY KEY NOT NULL,
    `generation_id` text NOT NULL,
    `generation_task_id` text,
    `file_id` text NOT NULL,

    `role` text NOT NULL,
    `sort_order` integer DEFAULT 0 NOT NULL,
    `params_json` text DEFAULT '{}' NOT NULL,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,

    FOREIGN KEY (`generation_id`) REFERENCES `generation`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`generation_task_id`) REFERENCES `generation_task`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`file_id`) REFERENCES `asset_file`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX `idx_generation_input_generation_role_sort`
ON `generation_input` (`generation_id`,`role`,`sort_order`);
--> statement-breakpoint

CREATE INDEX `idx_generation_input_task`
ON `generation_input` (`generation_task_id`);
--> statement-breakpoint

CREATE INDEX `idx_generation_input_file`
ON `generation_input` (`file_id`);
--> statement-breakpoint


-- =========================================================
-- 9. ASSET REGION
-- Rectangular slice inside a source image.
--
-- Use cases:
-- UI screen -> buttons / panels / icons
-- Map -> trees / buildings / decorations
-- Sprite sheet -> detected sprite regions
--
-- item_id:
-- null -> detected/temporary region
-- set  -> region promoted to a managed asset_item
-- =========================================================
CREATE TABLE `asset_region` (
    `id` text PRIMARY KEY NOT NULL,
    `project_id` text NOT NULL,
    `file_id` text NOT NULL,
    `item_id` text,

    `name` text,
    `type` text,

    `x` integer NOT NULL,
    `y` integer NOT NULL,
    `width` integer NOT NULL,
    `height` integer NOT NULL,

    `sort_order` integer DEFAULT 0 NOT NULL,
    `metadata_json` text DEFAULT '{}' NOT NULL,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,

    FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`file_id`) REFERENCES `asset_file`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`item_id`) REFERENCES `asset_item`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

CREATE INDEX `idx_asset_region_file_sort`
ON `asset_region` (`file_id`,`sort_order`);
--> statement-breakpoint

CREATE INDEX `idx_asset_region_item`
ON `asset_region` (`item_id`);
--> statement-breakpoint


-- =========================================================
-- 10. ANIMATION SET
-- Logical action collection for one asset + variant.
--
-- Examples:
-- Hero / Original / Walk / 8 directions
-- Hero / Battle Armor / Attack / single
-- Fire Explosion / Explode
-- =========================================================
CREATE TABLE `animation_set` (
    `id` text PRIMARY KEY NOT NULL,
    `project_id` text NOT NULL,
    `item_id` text NOT NULL,
    `variant_id` text,

    `name` text NOT NULL,

    -- idle, walk, run, jump, attack, hurt, death, fire_punch...
    `action` text NOT NULL,

    `perspective` text DEFAULT '' NOT NULL,

    -- single, 4, 8
    `direction_mode` text DEFAULT 'single' NOT NULL,

    `loop` integer DEFAULT true NOT NULL,

    `status` text DEFAULT 'draft' NOT NULL,
    `metadata_json` text DEFAULT '{}' NOT NULL,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `deleted_at` text,

    FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`item_id`) REFERENCES `asset_item`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`variant_id`) REFERENCES `asset_variant`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

CREATE INDEX `idx_animation_set_item_action_status`
ON `animation_set` (`item_id`,`action`,`status`);
--> statement-breakpoint

CREATE INDEX `idx_animation_set_project_updated`
ON `animation_set` (`project_id`,`updated_at`);
--> statement-breakpoint


-- =========================================================
-- 11. ANIMATION CLIP
-- One concrete direction inside one animation_set.
--
-- Mirroring can reuse east-facing clips for west-facing clips without
-- generating/storing duplicate frames.
-- =========================================================
CREATE TABLE `animation_clip` (
    `id` text PRIMARY KEY NOT NULL,
    `animation_set_id` text NOT NULL,

    -- none, north, north_east, east, south_east,
    -- south, south_west, west, north_west
    `direction` text DEFAULT 'none' NOT NULL,

    `is_mirrored` integer DEFAULT false NOT NULL,
    `mirror_source_clip_id` text,

    `sort_order` integer DEFAULT 0 NOT NULL,
    `status` text DEFAULT 'draft' NOT NULL,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,

    FOREIGN KEY (`animation_set_id`) REFERENCES `animation_set`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`mirror_source_clip_id`) REFERENCES `animation_clip`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

CREATE UNIQUE INDEX `idx_animation_clip_set_direction`
ON `animation_clip` (`animation_set_id`,`direction`);
--> statement-breakpoint

CREATE INDEX `idx_animation_clip_mirror_source`
ON `animation_clip` (`mirror_source_clip_id`);
--> statement-breakpoint


-- =========================================================
-- 12. ANIMATION VERSION
-- Non-destructive animation editing / Save as New Version.
-- =========================================================
CREATE TABLE `animation_version` (
    `id` text PRIMARY KEY NOT NULL,
    `clip_id` text NOT NULL,

    `version_no` integer NOT NULL,
    `parent_version_id` text,

    -- Logical AI operation that created/edited this version.
    `generation_id` text,

    `is_current` integer DEFAULT false NOT NULL,

    `fps` real DEFAULT 12 NOT NULL,
    `frame_width` integer NOT NULL,
    `frame_height` integer NOT NULL,
    `frame_count` integer DEFAULT 0 NOT NULL,

    -- Anchor, cleanup options, onion skin config, etc.
    `editor_json` text DEFAULT '{}' NOT NULL,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,

    FOREIGN KEY (`clip_id`) REFERENCES `animation_clip`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`parent_version_id`) REFERENCES `animation_version`(`id`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (`generation_id`) REFERENCES `generation`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

CREATE UNIQUE INDEX `idx_animation_version_clip_no`
ON `animation_version` (`clip_id`,`version_no`);
--> statement-breakpoint

CREATE UNIQUE INDEX `idx_animation_version_current`
ON `animation_version` (`clip_id`)
WHERE `is_current` = true;
--> statement-breakpoint

CREATE INDEX `idx_animation_version_generation`
ON `animation_version` (`generation_id`);
--> statement-breakpoint


-- =========================================================
-- 13. ANIMATION FRAME
-- Ordered frames inside one animation version.
--
-- duration_ms:
-- null -> use animation_version.fps
-- set  -> custom frame duration
--
-- offset_x / offset_y:
-- preserve visual anchor without rewriting image pixels.
-- =========================================================
CREATE TABLE `animation_frame` (
    `id` text PRIMARY KEY NOT NULL,
    `version_id` text NOT NULL,
    `file_id` text NOT NULL,

    `frame_index` integer NOT NULL,
    `duration_ms` integer,

    `offset_x` integer DEFAULT 0 NOT NULL,
    `offset_y` integer DEFAULT 0 NOT NULL,

    `metadata_json` text DEFAULT '{}' NOT NULL,

    `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,

    FOREIGN KEY (`version_id`) REFERENCES `animation_version`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`file_id`) REFERENCES `asset_file`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint

CREATE UNIQUE INDEX `idx_animation_frame_version_index`
ON `animation_frame` (`version_id`,`frame_index`);
--> statement-breakpoint

CREATE INDEX `idx_animation_frame_file`
ON `animation_frame` (`file_id`);
