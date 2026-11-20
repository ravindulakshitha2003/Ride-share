import { useState, useCallback } from 'react';
import { searchAvailableRides } from '../api/rideService';

/**
 * Custom React Hook to manage ride matching search state, loading indicators,
 * and error messages.
 */
export default function useRideSearch() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const executeSearch = useCallback(async (searchParams) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const results = await searchAvailableRides(searchParams);
      setRides(results);
      return results;
    } catch (err) {
      const message = err.message || 'Failed to search rides';
      setError(message);
      setRides([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetSearch = useCallback(() => {
    setRides([]);
    setError(null);
    setHasSearched(false);
    setLoading(false);
  }, []);

  return { rides, loading, error, hasSearched, executeSearch, resetSearch, setRides };
}