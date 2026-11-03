/** Only the video provider is substituted. Auth, credits, R2 and extraction stay real.
 * Set enabled to false to test the real model. Never enabled in production builds.
 */
export const animationVideoTest = {
  enabled: false,
  path: '/videos/demo.mp4',
} as const;

export function usesAnimationTestVideo() {
  return process.env.NODE_ENV === 'development' && animationVideoTest.enabled;
}
