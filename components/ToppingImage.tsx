'use client';

import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { useState } from 'react';

interface ToppingImageProps {
  src?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  roundedClassName?: string;
}

export function ToppingImage({
  src,
  alt,
  sizes,
  priority = false,
  className = '',
  roundedClassName = 'rounded-xl',
}: ToppingImageProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const safeSrc =
    src?.startsWith('/api/toppings/') ||
    src?.startsWith('/images/') ||
    src?.startsWith('data:image/')
      ? src
      : undefined;

  return (
    <div
      className={`relative aspect-square overflow-hidden ${roundedClassName} bg-stone-100 ${className}`}
    >
      {safeSrc && safeSrc !== failedSrc ? (
        <Image
          src={safeSrc}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFailedSrc(safeSrc)}
          className="object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-400"
          role="img"
          aria-label={`Foto ${alt} belum tersedia`}
        >
          <ImageIcon className="h-8 w-8" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
