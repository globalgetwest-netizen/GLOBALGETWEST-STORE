"use client"
import React, { createContext, useContext, useState } from 'react';

type CurrencyContextType = {
  currency: string;
  setCurrency: (c: string) => void;
  formatPrice: (price: number | string) => string;
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
  formatPrice: (p) => `$${Number(p).toFixed(2)}`,
});

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrency] = useState('USD');
  // For now, base is USD. In a real app, integrate a rates API here.
  const formatPrice = (price: number | string) => {
    const val = Number(price);
    return currency === 'USD' ? `$${val.toFixed(2)}` : `${currency} ${(val * 1).toFixed(2)}`;
  };
  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
