'use client';
// components/ProductGallery.tsx
import { useState } from 'react';

interface ImageItem { id?: string; url: string; alt_text?: string | null; }

export function ProductGallery({ images, productName }: { images: ImageItem[]; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  return (
    <div>
      <div className="aspect-square rounded-lg bg-[var(--color-parchment-warm)] overflow-hidden border border-[var(--color-border)] group relative">
        {active ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={active.url}
            alt={active.alt_text ?? productName}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[var(--color-ink-soft)]">No image</div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img.id ?? i}
              onClick={() => setActiveIndex(i)}
              className={`focus-ring aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                i === activeIndex ? 'border-[var(--color-ochre)]' : 'border-transparent hover:border-[var(--color-border)]'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
