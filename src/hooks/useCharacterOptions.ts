/**
 * Custom hooks for fetching character creation options from the API
 */

import { useState, useEffect } from 'react';
import {
  fetchRaces,
  fetchRaceDetails,
  fetchClasses,
  fetchSubclasses,
  fetchBackgrounds,
  fetchAlignments
} from '@/services/api/characterOptions';

// No fallback imports needed - using API data only

interface UseDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and cache race/species data
 */
export const useRaces = (): UseDataResult<string> => {
  const [races, setRaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRaces = async () => {
      try {
        const apiRaces = await fetchRaces();
        const raceNames = apiRaces.map(race => race.name);
        
        // Sort alphabetically
        raceNames.sort((a, b) => a.localeCompare(b));
        setRaces(raceNames);
      } catch (err) {
        console.error('Failed to fetch races:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch races');
        // No fallback - leave empty array
        setRaces([]);
      } finally {
        setLoading(false);
      }
    };

    loadRaces();
  }, []);

  return { data: races, loading, error };
};

/**
 * Hook to fetch and cache class data
 */
export const useClasses = (): UseDataResult<string> => {
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const apiClasses = await fetchClasses();
        const classNames = apiClasses.map(cls => cls.name);
        // Sort alphabetically
        classNames.sort((a, b) => a.localeCompare(b));
        setClasses(classNames);
      } catch (err) {
        console.error('Failed to fetch classes:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch classes');
        // No fallback - leave empty array
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, []);

  return { data: classes, loading, error };
};

/**
 * Hook to fetch and cache alignment data
 */
export const useAlignments = (): UseDataResult<string> => {
  const [alignments, setAlignments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAlignments = async () => {
      try {
        const apiAlignments = await fetchAlignments();
        const alignmentNames = apiAlignments.map(alignment => alignment.name);
        // Sort alphabetically
        alignmentNames.sort((a, b) => a.localeCompare(b));
        setAlignments(alignmentNames);
      } catch (err) {
        console.error('Failed to fetch alignments:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch alignments');
        // No fallback - leave empty array
        setAlignments([]);
      } finally {
        setLoading(false);
      }
    };

    loadAlignments();
  }, []);

  return { data: alignments, loading, error };
};

/**
 * Hook to fetch background data (currently limited API coverage)
 */
export const useBackgrounds = (): UseDataResult<string> => {
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBackgrounds = async () => {
      try {
        const apiBackgrounds = await fetchBackgrounds();
        const backgroundNames = apiBackgrounds.map(bg => bg.name);
        
        // Sort alphabetically
        backgroundNames.sort((a, b) => a.localeCompare(b));
        setBackgrounds(backgroundNames);
      } catch (err) {
        console.error('Failed to fetch backgrounds:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch backgrounds');
        // No fallback - leave empty array
        setBackgrounds([]);
      } finally {
        setLoading(false);
      }
    };

    loadBackgrounds();
  }, []);

  return { data: backgrounds, loading, error };
};

/**
 * Hook to fetch and organize subclass data by parent class
 */
export const useSubclasses = (): { 
  data: Record<string, string[]>; 
  loading: boolean; 
  error: string | null 
} => {
  const [subclasses, setSubclasses] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSubclasses = async () => {
      try {
        const apiSubclasses = await fetchSubclasses();
        
        // Group subclasses by parent class
        const groupedSubclasses: Record<string, string[]> = {};
        
        apiSubclasses.forEach(subclass => {
          if (subclass.class) {
            const className = subclass.class.name;
            if (!groupedSubclasses[className]) {
              groupedSubclasses[className] = [];
            }
            groupedSubclasses[className].push(subclass.name);
          }
        });
        
        // Sort subclasses within each class alphabetically
        Object.keys(groupedSubclasses).forEach(className => {
          groupedSubclasses[className].sort((a, b) => a.localeCompare(b));
        });
        
        setSubclasses(groupedSubclasses);
      } catch (err) {
        console.error('Failed to fetch subclasses:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subclasses');
        // No fallback - leave empty object
        setSubclasses({});
      } finally {
        setLoading(false);
      }
    };

    loadSubclasses();
  }, []);

  return { data: subclasses, loading, error };
};

/**
 * Hook to fetch subspecies/subraces for a given species
 */
export const useSubspecies = (selectedSpecies: string): UseDataResult<string> => {
  const [subspecies, setSubspecies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clear subspecies immediately when no species is selected
    if (!selectedSpecies || selectedSpecies.trim() === '') {
      setSubspecies([]);
      setLoading(false);
      setError(null);
      return;
    }

    const loadSubspecies = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Convert species name to API index format (lowercase, hyphenated)
        const raceIndex = selectedSpecies.toLowerCase().replace(/\s+/g, '-');
        
        try {
          const raceDetails = await fetchRaceDetails(raceIndex);
          const subraceNames = raceDetails.subraces.map(subrace => subrace.name);
          // Sort alphabetically
          subraceNames.sort((a, b) => a.localeCompare(b));
          setSubspecies(subraceNames);
        } catch {
          // No fallback - leave empty array
          setSubspecies([]);
        }
      } catch (err) {
        console.error(`Failed to fetch subspecies for ${selectedSpecies}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subspecies');
        // No fallback - leave empty array
        setSubspecies([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubspecies();
  }, [selectedSpecies]);

  return { data: subspecies, loading, error };
};

/**
 * Main hook that provides all character options
 */
export const useCharacterOptions = () => {
  const races = useRaces();
  const classes = useClasses();
  const alignments = useAlignments();
  const backgrounds = useBackgrounds();
  const subclasses = useSubclasses();

  const loading = races.loading || classes.loading || alignments.loading || backgrounds.loading || subclasses.loading;
  const hasError = !!(races.error || classes.error || alignments.error || backgrounds.error || subclasses.error);

  return {
    races: races.data,
    classes: classes.data,
    alignments: alignments.data,
    backgrounds: backgrounds.data,
    subclasses: subclasses.data,
    loading,
    hasError,
    errors: {
      races: races.error,
      classes: classes.error,
      alignments: alignments.error,
      backgrounds: backgrounds.error,
      subclasses: subclasses.error,
    }
  };
};