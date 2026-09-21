import type { Frame, SliceOptions, Tool } from './core';

export type Handoff = {
  target: Tool;
  frames: Frame[];
  sheet?: Frame;
  slice?: SliceOptions;
};
// One explicit handoff per tab. No upload, storage, or refresh persistence.
let pending: Handoff | undefined;
export function sendHandoff(value: Handoff) {
  pending = value;
}
export function takeHandoff(target: Tool) {
  if (pending?.target !== target) return undefined;
  const value = pending;
  pending = undefined;
  return value;
}
