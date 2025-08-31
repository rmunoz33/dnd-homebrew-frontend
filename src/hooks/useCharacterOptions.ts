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

// Fallback data for incomplete API coverage
import {
  characterSpecies,
  characterSubspecies,
  characterBackgrounds,
  characterClasses,
  characterSubclasses,
  characterAlignments
} from '@/app/components/Character/characterValueOptions';

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
        
        // Merge with hardcoded races that aren't in API yet
        const missingRaces = characterSpecies.filter(species => 
          !raceNames.some(apiRace => apiRace.toLowerCase() === species.toLowerCase())
        );
        
        const allRaces = [...raceNames, ...missingRaces];
        // Sort alphabetically
        allRaces.sort((a, b) => a.localeCompare(b));
        setRaces(allRaces);
      } catch (err) {
        console.error('Failed to fetch races, using fallback:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch races');
        // Use fallback data (sorted)
        const sortedFallback = [...characterSpecies].sort((a, b) => a.localeCompare(b));
        setRaces(sortedFallback);
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
        setClasses(classNames);
      } catch (err) {
        console.error('Failed to fetch classes, using fallback:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch classes');
        // Use fallback data
        setClasses(characterClasses);
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
        setAlignments(alignmentNames);
      } catch (err) {
        console.error('Failed to fetch alignments, using fallback:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch alignments');
        // Use fallback data
        setAlignments(characterAlignments);
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
        
        // Since API only has 1 background, merge with hardcoded ones
        const allBackgrounds = [...new Set([...backgroundNames, ...characterBackgrounds])];
        setBackgrounds(allBackgrounds);
      } catch (err) {
        console.error('Failed to fetch backgrounds, using fallback:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch backgrounds');
        // Use fallback data
        setBackgrounds(characterBackgrounds);
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
        
        // Merge with hardcoded subclasses for any missing ones
        Object.keys(characterSubclasses).forEach(className => {
          if (!groupedSubclasses[className]) {
            groupedSubclasses[className] = characterSubclasses[className as keyof typeof characterSubclasses];
          } else {
            // Add any missing subclasses from hardcoded data
            const existingSubclasses = groupedSubclasses[className];
            const hardcodedSubclasses = characterSubclasses[className as keyof typeof characterSubclasses];
            const missingSubclasses = hardcodedSubclasses.filter(sub => 
              !existingSubclasses.some(existing => existing.toLowerCase() === sub.toLowerCase())
            );
            groupedSubclasses[className] = [...existingSubclasses, ...missingSubclasses];
          }
        });
        
        setSubclasses(groupedSubclasses);
      } catch (err) {
        console.error('Failed to fetch subclasses, using fallback:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subclasses');
        // Use fallback data
        setSubclasses(characterSubclasses);
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
    if (!selectedSpecies) {
      setSubspecies([]);
      return;
    }

    const loadSubspecies = async () => {
      setLoading(true);
      try {
        // Convert species name to API index format (lowercase, hyphenated)
        const raceIndex = selectedSpecies.toLowerCase().replace(/\s+/g, '-');
        
        try {
          const raceDetails = await fetchRaceDetails(raceIndex);
          const subraceNames = raceDetails.subraces.map(subrace => subrace.name);
          setSubspecies(subraceNames);
        } catch {
          // Fall back to hardcoded data if API fails
          const hardcodedSubspecies = characterSubspecies[selectedSpecies as keyof typeof characterSubspecies] || [];
          setSubspecies(hardcodedSubspecies);
        }
      } catch (err) {
        console.error(`Failed to fetch subspecies for ${selectedSpecies}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subspecies');
        // Use fallback data
        const hardcodedSubspecies = characterSubspecies[selectedSpecies as keyof typeof characterSubspecies] || [];
        setSubspecies(hardcodedSubspecies);
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