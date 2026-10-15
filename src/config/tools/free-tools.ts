export const FREE_TOOL_PATHS = {
  gif: '/gif-to-sprite-sheet',
  video: '/video-to-sprite-sheet',
  background: '/transparent-background-maker',
  gifBackground: '/gif-background-remover',
} as const;
export type FreeTool = keyof typeof FREE_TOOL_PATHS;
export const VIDEO_LIMIT = 5 * 1024 * 1024;
export const BACKGROUND_LIMIT = 10 * 1024 * 1024;
export const BACKGROUND_BATCH_LIMIT = 20;
export const FRAME_SIZES = [64, 128, 256, 512] as const;
export const VIDEO_DEFAULTS = {
  frame_count: 16,
  frame_size: 256,
  fps: 12,
  loop: false,
};
export type VideoOptions = typeof VIDEO_DEFAULTS;
