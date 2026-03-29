import React, { createContext, useContext, useEffect, useState } from 'react';

export type CurrencyOption = 'UGX' | 'USD' | 'KES' | 'TZS';

interface CurrencyContextValue {
  currency: CurrencyOption;
  setCurrency: (value: CurrencyOption) => void;
  formatCurrency: (amountInUgx: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const currencyConfig: Record<CurrencyOption, { code: string; locale: string; rate: number }> = {
  UGX: { code: 'UGX', locale: 'en-UG', rate: 1 },
  USD: { code: 'USD', locale: 'en-US', rate: 1 / 3800 },
  KES: { code: 'KES', locale: 'en-KE', rate: 1 / 40 },
  TZS: { code: 'TZS', locale: 'en-TZ', rate: 1 / 1.5 } // approximate conversion
};

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyOption>('UGX');

  useEffect(() => {
    const stored = localStorage.getItem('appCurrency') as CurrencyOption | null;
    if (stored && Object.keys(currencyConfig).includes(stored)) {
      setCurrencyState(stored);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('appCurrency', currency);
  }, [currency]);

  const setCurrency = (value: CurrencyOption) => {
    if (Object.keys(currencyConfig).includes(value)) {
      setCurrencyState(value);
    }
  };

  const formatCurrency = (amountInUgx: number) => {
    const config = currencyConfig[currency];
    const convertedValue = amountInUgx * config.rate;

    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      maximumFractionDigits: currency === 'UGX' ? 0 : 2
    }).format(convertedValue);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};
