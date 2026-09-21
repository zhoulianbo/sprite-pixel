import Image from 'next/image';

import { Link } from '@/core/i18n/navigation';
import { Brand as BrandType } from '@/shared/types/blocks/common';

export function BrandLogo({ brand }: { brand: BrandType }) {
  return (
    <Link
      href={brand.url || '/'}
      target={brand.target || '_self'}
      className={`text-foreground flex items-center space-x-3 ${brand.className || ''}`}
    >
      {brand.logo && (
        <Image
          src={brand.logo.src}
          alt={brand.title ? '' : brand.logo.alt || ''}
          width={brand.logo.width || 80}
          height={brand.logo.height || 80}
          className="h-8 w-auto rounded-none"
          unoptimized={brand.logo.src.startsWith('http')}
        />
      )}
      {brand.title && (
        <span className="text-lg font-medium">
          {brand.title === 'SpritePixel' ? (
            <>
              <span className="text-foreground">Sprite</span>
              <span className="text-primary">Pixel</span>
            </>
          ) : (
            brand.title
          )}
        </span>
      )}
    </Link>
  );
}
