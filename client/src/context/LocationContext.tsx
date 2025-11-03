
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  const { currentUser } = useAuth();
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      if (!currentUser) return;

      try {
        const { data, error } = await supabase.rpc('get_unique_locations', { user_id_param: currentUser.id });

        if (error) {
          console.error('Error fetching unique locations:', error);
          throw error;
        }

        if (data) {
          setLocations(data.sort());
        }
      } catch (error) {
        console.error('An unexpected error occurred while fetching locations:', error);
      }
    };

    fetchLocations();
  }, [currentUser]);

  return (
    <LocationContext.Provider value={{ locations }}>
      {children}
    </LocationContext.Provider>
  );
};
