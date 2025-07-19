import { useState, useEffect } from "react";
import {
  dndApi,
  ApiReference,
  Race,
  Class,
  Subrace,
  Subclass,
  Background,
  Alignment,
} from "@/services/dndApi";

// Generic hook for fetching list data
function useApiList<T>(
  fetchFunction: () => Promise<{ count: number; results: T[] }>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchFunction();

        if (mounted) {
          setData(response.results);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "An error occurred");
          console.error("API fetch error:", err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, dependencies);

  return { data, loading, error };
}

// Hook for races
export function useRaces() {
  return useApiList<ApiReference>(dndApi.getRaces);
}

// Hook for subraces with race dependency
export function useSubraces(raceIndex?: string) {
  const [data, setData] = useState<ApiReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchSubraces = async () => {
      if (!raceIndex) {
        setData([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const subraces = await dndApi.getSubracesForRace(raceIndex);

        if (mounted) {
          setData(subraces);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "An error occurred");
          console.error("Error fetching subraces:", err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchSubraces();

    return () => {
      mounted = false;
    };
  }, [raceIndex]);

  return { data, loading, error };
}

// Hook for classes
export function useClasses() {
  return useApiList<ApiReference>(dndApi.getClasses);
}

// Hook for subclasses with class dependency
export function useSubclasses(classIndexes: string[]) {
  const [data, setData] = useState<ApiReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchSubclasses = async () => {
      if (classIndexes.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch subclasses for all selected classes
        const allSubclasses = await Promise.all(
          classIndexes.map((classIndex) =>
            dndApi.getSubclassesForClass(classIndex)
          )
        );

        // Flatten and deduplicate subclasses
        const uniqueSubclasses = allSubclasses
          .flat()
          .filter(
            (subclass, index, arr) =>
              arr.findIndex((s) => s.index === subclass.index) === index
          );

        if (mounted) {
          setData(uniqueSubclasses);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "An error occurred");
          console.error("Error fetching subclasses:", err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchSubclasses();

    return () => {
      mounted = false;
    };
  }, [classIndexes.join(",")]); // Use join to create a stable dependency

  return { data, loading, error };
}

// Hook for backgrounds
export function useBackgrounds() {
  return useApiList<ApiReference>(dndApi.getBackgrounds);
}

// Hook for alignments
export function useAlignments() {
  return useApiList<ApiReference>(dndApi.getAlignments);
}

// Hook for individual race details
export function useRace(raceIndex?: string) {
  const [data, setData] = useState<Race | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchRace = async () => {
      if (!raceIndex) {
        setData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const race = await dndApi.getRace(raceIndex);

        if (mounted) {
          setData(race);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "An error occurred");
          console.error("Error fetching race:", err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchRace();

    return () => {
      mounted = false;
    };
  }, [raceIndex]);

  return { data, loading, error };
}

// Hook for individual class details
export function useClass(classIndex?: string) {
  const [data, setData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchClass = async () => {
      if (!classIndex) {
        setData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const classData = await dndApi.getClass(classIndex);

        if (mounted) {
          setData(classData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "An error occurred");
          console.error("Error fetching class:", err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchClass();

    return () => {
      mounted = false;
    };
  }, [classIndex]);

  return { data, loading, error };
}

// Utility hook for filtering data based on search term
export function useFilteredData<T extends { name: string }>(
  data: T[],
  searchTerm: string
) {
  const [filteredData, setFilteredData] = useState<T[]>([]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(data);
    } else {
      const filtered = data.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [data, searchTerm]);

  return filteredData;
}

// Hook for preloading common data
export function usePreloadData() {
  const [isPreloaded, setIsPreloaded] = useState(false);

  useEffect(() => {
    const preloadData = async () => {
      try {
        // Preload commonly used data
        await Promise.all([
          dndApi.getRaces(),
          dndApi.getClasses(),
          dndApi.getBackgrounds(),
          dndApi.getAlignments(),
        ]);
        setIsPreloaded(true);
      } catch (error) {
        console.error("Error preloading data:", error);
        // Don't fail the app if preloading fails
        setIsPreloaded(true);
      }
    };

    preloadData();
  }, []);

  return isPreloaded;
}
