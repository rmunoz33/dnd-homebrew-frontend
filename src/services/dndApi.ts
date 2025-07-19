// D&D 5e API Service with caching and error handling
const API_BASE = "https://www.dnd5eapi.co/api/2014";

// Cache configuration
const CACHE_DURATION = 3600000; // 1 hour
const cache = new Map<string, { data: unknown; timestamp: number }>();

// API Response Types
export interface ApiListResponse<T> {
  count: number;
  results: T[];
}

export interface ApiReference {
  index: string;
  name: string;
  url: string;
}

export interface Race extends ApiReference {
  speed: number;
  ability_bonuses: Array<{
    ability_score: ApiReference;
    bonus: number;
  }>;
  age: string;
  alignment: string;
  size: string;
  size_description: string;
  starting_proficiencies: ApiReference[];
  languages: ApiReference[];
  subraces?: ApiReference[];
}

export interface Subrace extends ApiReference {
  race: ApiReference;
  desc: string;
  ability_bonuses: Array<{
    ability_score: ApiReference;
    bonus: number;
  }>;
  starting_proficiencies: ApiReference[];
  languages: ApiReference[];
}

export interface Class extends ApiReference {
  hit_die: number;
  proficiency_choices: Array<{
    desc: string;
    choose: number;
    type: string;
    from: {
      option_set_type: string;
      options: Array<{
        option_type: string;
        item: ApiReference;
      }>;
    };
  }>;
  proficiencies: ApiReference[];
  saving_throws: ApiReference[];
  starting_equipment: Array<{
    equipment: ApiReference;
    quantity: number;
  }>;
  class_levels: string;
  subclasses: ApiReference[];
}

export interface Subclass extends ApiReference {
  class: ApiReference;
  desc: string;
  subclass_flavor: string;
  subclass_levels: string;
}

export interface Background extends ApiReference {
  starting_proficiencies: ApiReference[];
  language_options: {
    choose: number;
    from: {
      option_set_type: string;
      options: Array<{
        option_type: string;
        item: ApiReference;
      }>;
    };
  };
  starting_equipment: Array<{
    equipment: ApiReference;
    quantity: number;
  }>;
  starting_equipment_options: Array<{
    choose: number;
    from: {
      option_set_type: string;
      options: Array<{
        option_type: string;
        item: ApiReference;
      }>;
    };
  }>;
  feature: ApiReference;
  personality_traits: {
    choose: number;
    from: string[];
  };
}

export interface Alignment extends ApiReference {
  desc: string;
  abbreviation: string;
}

// Generic fetch function with caching
async function fetchWithCache<T>(url: string): Promise<T> {
  const cacheKey = url;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

// API Functions
export const dndApi = {
  // Races
  async getRaces(): Promise<ApiListResponse<ApiReference>> {
    return fetchWithCache<ApiListResponse<ApiReference>>(`${API_BASE}/races`);
  },

  async getRace(index: string): Promise<Race> {
    return fetchWithCache<Race>(`${API_BASE}/races/${index}`);
  },

  // Subraces
  async getSubraces(): Promise<ApiListResponse<ApiReference>> {
    return fetchWithCache<ApiListResponse<ApiReference>>(
      `${API_BASE}/subraces`
    );
  },

  async getSubrace(index: string): Promise<Subrace> {
    return fetchWithCache<Subrace>(`${API_BASE}/subraces/${index}`);
  },

  // Classes
  async getClasses(): Promise<ApiListResponse<ApiReference>> {
    return fetchWithCache<ApiListResponse<ApiReference>>(`${API_BASE}/classes`);
  },

  async getClass(index: string): Promise<Class> {
    return fetchWithCache<Class>(`${API_BASE}/classes/${index}`);
  },

  // Subclasses
  async getSubclasses(): Promise<ApiListResponse<ApiReference>> {
    return fetchWithCache<ApiListResponse<ApiReference>>(
      `${API_BASE}/subclasses`
    );
  },

  async getSubclass(index: string): Promise<Subclass> {
    return fetchWithCache<Subclass>(`${API_BASE}/subclasses/${index}`);
  },

  // Backgrounds
  async getBackgrounds(): Promise<ApiListResponse<ApiReference>> {
    return fetchWithCache<ApiListResponse<ApiReference>>(
      `${API_BASE}/backgrounds`
    );
  },

  async getBackground(index: string): Promise<Background> {
    return fetchWithCache<Background>(`${API_BASE}/backgrounds/${index}`);
  },

  // Alignments
  async getAlignments(): Promise<ApiListResponse<ApiReference>> {
    return fetchWithCache<ApiListResponse<ApiReference>>(
      `${API_BASE}/alignments`
    );
  },

  async getAlignment(index: string): Promise<Alignment> {
    return fetchWithCache<Alignment>(`${API_BASE}/alignments/${index}`);
  },

  // Utility functions
  async getSubracesForRace(raceIndex: string): Promise<ApiReference[]> {
    const allSubraces = await this.getSubraces();
    const race = await this.getRace(raceIndex);

    // Filter subraces that belong to this race
    return allSubraces.results.filter((subrace) => {
      // This is a simplified approach - in practice, you might need to fetch each subrace
      // to check its race property, or the API might provide a better way to filter
      return (
        subrace.index.includes(raceIndex) ||
        subrace.name.toLowerCase().includes(race.name.toLowerCase())
      );
    });
  },

  async getSubclassesForClass(classIndex: string): Promise<ApiReference[]> {
    const allSubclasses = await this.getSubclasses();
    const classData = await this.getClass(classIndex);

    // Return subclasses that belong to this class
    return classData.subclasses || [];
  },

  // Clear cache (useful for testing or when you need fresh data)
  clearCache(): void {
    cache.clear();
  },

  // Get cache stats (useful for debugging)
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: cache.size,
      entries: Array.from(cache.keys()),
    };
  },
};
