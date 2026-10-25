'use client';

import { useEffect } from 'react';

const ANIMATION_CLASSES = [
  'animate-marquee',
  'group-hover:[animation-play-state:paused]',
  'group-focus-within:animate-none',
  'motion-reduce:animate-none',
];

// Enhance the existing server-rendered links without moving them into client data.
export function FooterLinkMarquee({ sourceId }: { sourceId: string }) {
  useEffect(() => {
    const source = document.getElementById(sourceId);
    const viewport = source?.parentElement;
    if (!source || !viewport) return;

    let clone: HTMLElement | null = null;

    const removeClone = () => {
      clone?.remove();
      clone = null;
    };

    const updateMarquee = () => {
      const width = source.scrollWidth;
      const overflowing = width > viewport.clientWidth + 1;
      viewport.dataset.overflow = String(overflowing);

      if (!overflowing) {
        source.classList.remove(...ANIMATION_CLASSES);
        removeClone();
        return;
      }

      viewport.style.setProperty('--duration', `${Math.max(24, width / 35)}s`);
      source.classList.add(...ANIMATION_CLASSES);

      if (!clone) {
        clone = source.cloneNode(false) as HTMLElement;
        clone.removeAttribute('id');
        clone.removeAttribute('aria-label');
        clone.setAttribute('aria-hidden', 'true');
        clone.dataset.footerLinkClone = 'true';
        clone.classList.add(
          'motion-reduce:hidden',
          'group-focus-within:hidden'
        );
        viewport.append(clone);
      }

      clone.innerHTML = source.innerHTML;
      clone.querySelectorAll('a').forEach((link) => {
        link.tabIndex = -1;
      });
    };

    // Image loading and responsive layout can change the natural row width.
    const resizeObserver = new ResizeObserver(updateMarquee);
    resizeObserver.observe(source);
    resizeObserver.observe(viewport);
    const mutationObserver = new MutationObserver(updateMarquee);
    mutationObserver.observe(source, { childList: true, subtree: true });
    updateMarquee();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      source.classList.remove(...ANIMATION_CLASSES);
      viewport.style.removeProperty('--duration');
      delete viewport.dataset.overflow;
      removeClone();
    };
  }, [sourceId]);

  return null;
}
