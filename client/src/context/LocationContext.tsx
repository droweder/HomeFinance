
import React, { createContext, useContext, useMemo } from 'react';
import { useFinance } from './FinanceContext';
import { useCreditCard } from './CreditCardContext';

interface LocationContextType {
  locations: string[];
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocations = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocations must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { expenses, income } = useFinance();
  const { creditCards } = useCreditCard();

  const locations = useMemo(() => {
    const allLocations = new Set<string>();

    expenses.forEach(expense => {
      if (expense.location) {
        allLocations.add(expense.location);
      }
    });

    income.forEach(i => {
      if (i.location) {
        allLocations.add(i.location);
      }
    });

    creditCards.forEach(cc => {
      if (cc.location) {
        allLocations.add(cc.location);
      }
    });

    return Array.from(allLocations).sort();
  }, [expenses, income, creditCards]);

  return (
    <LocationContext.Provider value={{ locations }}>
      {children}
    </LocationContext.Provider>
  );
};
