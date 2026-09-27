export type AnimationFrameCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StoredAnimationFrame = {
  id: string;
  fileId?: string;
  durationMs: number | null;
  offsetX: number;
  offsetY: number;
  crop?: AnimationFrameCrop;
};

export function parseAnimationFrames(value?: string | null) {
  try {
    const frames = JSON.parse(value || '[]');
    if (!Array.isArray(frames)) return [];
    return frames.filter((frame): frame is StoredAnimationFrame =>
      Boolean(
        frame &&
        typeof frame === 'object' &&
        typeof frame.id === 'string' &&
        frame.id
      )
    );
  } catch {
    return [];
  }
}

export function animationFrameFileId(
  frame: StoredAnimationFrame,
  spritesheetFileId?: string | null
) {
  return frame.fileId || spritesheetFileId || '';
}
