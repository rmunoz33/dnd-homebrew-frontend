/**
 * API service for fetching character creation options from the D&D content database
 */

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_DB_URL || 'https://fables-and-sagas-production.up.railway.app';

export interface ApiResponse<T> {
  count: number;
  total: number;
  page: number;
  total_pages: number;
  results: T[];
}

export interface RaceOption {
  index: string;
  name: string;
  url: string;
}

export interface ClassOption {
  index: string;
  name: string;
  url: string;
}

export interface SubclassOption {
  index: string;
  name: string;
  url: string;
  class?: {
    index: string;
    name: string;
    url: string;
  };
}

export interface BackgroundOption {
  index: string;
  name: string;
  url: string;
}

export interface AlignmentOption {
  index: string;
  name: string;
  url: string;
}

export interface RaceDetails {
  index: string;
  name: string;
  subraces: Array<{
    index: string;
    name: string;
    url: string;
  }>;
  url: string;
}

/**
 * Fetch all available races/species
 */
export const fetchRaces = async (): Promise<RaceOption[]> => {
  const response = await fetch(`${API_BASE}/api/2014/races`);
  if (!response.ok) {
    throw new Error(`Failed to fetch races: ${response.statusText}`);
  }
  const data: ApiResponse<RaceOption> = await response.json();
  return data.results;
};

/**
 * Fetch detailed race information including subraces
 */
export const fetchRaceDetails = async (raceIndex: string): Promise<RaceDetails> => {
  const response = await fetch(`${API_BASE}/api/2014/races/${raceIndex}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch race details for ${raceIndex}: ${response.statusText}`);
  }
  return response.json();
};

/**
 * Fetch all available classes
 */
export const fetchClasses = async (): Promise<ClassOption[]> => {
  const response = await fetch(`${API_BASE}/api/2014/classes`);
  if (!response.ok) {
    throw new Error(`Failed to fetch classes: ${response.statusText}`);
  }
  const data: ApiResponse<ClassOption> = await response.json();
  return data.results;
};

/**
 * Fetch all available subclasses from paginated endpoint and add class associations
 * This ensures we get all subclasses (not just those linked to classes)
 */
export const fetchSubclasses = async (): Promise<SubclassOption[]> => {
  const allSubclasses: SubclassOption[] = [];
  let page = 1;
  let hasMore = true;

  // Fetch all pages from the paginated subclasses endpoint
  while (hasMore) {
    const url = page === 1
      ? `${API_BASE}/api/2014/subclasses`
      : `${API_BASE}/api/2014/subclasses?page=${page}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch subclasses page ${page}`);
      break;
    }

    const data: ApiResponse<SubclassOption> = await response.json();
    allSubclasses.push(...data.results);

    // Check if there are more pages
    hasMore = page < (data.total_pages || 1);
    page++;
  }

  // Now fetch detailed info for each subclass to get class associations
  const subclassDetailsPromises = allSubclasses.map(async (subclass) => {
    try {
      const response = await fetch(`${API_BASE}/api/2014/subclasses/${subclass.index}`);
      if (!response.ok) {
        console.error(`Failed to fetch details for subclass ${subclass.index}`);
        return subclass; // Return original if fetch fails
      }
      const details = await response.json();
      return {
        ...subclass,
        class: details.class, // Add the class association from detailed endpoint
      };
    } catch (error) {
      console.error(`Error fetching subclass ${subclass.index}:`, error);
      return subclass; // Return original on error
    }
  });

  return Promise.all(subclassDetailsPromises);
};

/**
 * Fetch all available backgrounds
 */
export const fetchBackgrounds = async (): Promise<BackgroundOption[]> => {
  const response = await fetch(`${API_BASE}/api/2014/backgrounds`);
  if (!response.ok) {
    throw new Error(`Failed to fetch backgrounds: ${response.statusText}`);
  }
  const data: ApiResponse<BackgroundOption> = await response.json();
  return data.results;
};

/**
 * Fetch all available alignments
 */
export const fetchAlignments = async (): Promise<AlignmentOption[]> => {
  const response = await fetch(`${API_BASE}/api/2014/alignments`);
  if (!response.ok) {
    throw new Error(`Failed to fetch alignments: ${response.statusText}`);
  }
  const data: ApiResponse<AlignmentOption> = await response.json();
  return data.results;
};