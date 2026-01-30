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

/**
 * Fetch subclasses for a specific class (lazy loading)
 * Uses the /api/2014/classes/{classIndex}/subclasses endpoint
 */
export const fetchSubclassesForClass = async (classIndex: string): Promise<SubclassOption[]> => {
  const response = await fetch(`${API_BASE}/api/2014/classes/${classIndex}/subclasses`);
  if (!response.ok) {
    if (response.status === 404) {
      return []; // Class has no subclasses
    }
    throw new Error(`Failed to fetch subclasses for ${classIndex}: ${response.statusText}`);
  }
  const data: ApiResponse<SubclassOption> = await response.json();
  return data.results;
};
