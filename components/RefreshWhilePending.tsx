'use client';
// components/RefreshWhilePending.tsx
// Customers land on the order page straight from the payment page, usually
// a few seconds before the gateway's webhook marks the order paid. Re-check
// quietly for a minute so the page flips to "Thank you" on its own.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function RefreshWhilePending() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= 15) clearInterval(timer);
    }, 4000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
