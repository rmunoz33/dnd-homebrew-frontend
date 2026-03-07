import { connectDB } from '@/lib/db/connection'
import { escapeRegExp } from '@/lib/db/utils'
import type { ReturnModelType } from '@typegoose/typegoose'

interface CacheEntry {
  data: unknown
  timestamp: number
}

const CACHE_DURATION = 3600000 // 1 hour

export function createDbLookupTool(
  Model: ReturnModelType<any>,
  resourceName: string,
  paramName: string,
  options?: { lookupByIndex?: boolean }
) {
  const cache = new Map<string, CacheEntry>()

  return async (params: Record<string, unknown>): Promise<unknown> => {
    const name = params[paramName] as string
    const cacheKey = `${resourceName}_${name.toLowerCase()}`
    const cached = cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    try {
      await connectDB()

      const escapedName = escapeRegExp(name)
      let data

      if (options?.lookupByIndex) {
        // Try index first (kebab-case), then name
        data = await Model.findOne({ index: name.toLowerCase() }).lean()
        if (!data) {
          data = await Model.findOne({
            name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
          }).lean()
        }
      } else {
        data = await Model.findOne({
          name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
        }).lean()
      }

      if (!data) {
        return {
          error: true,
          message: `${resourceName} "${name}" not found. Please check the spelling or try a different name.`,
        }
      }

      // Serialize to strip non-plain objects (e.g. ObjectId buffers) so
      // results can safely pass from Server Components to Client Components
      const plainData = JSON.parse(JSON.stringify(data))
      cache.set(cacheKey, { data: plainData, timestamp: Date.now() })
      return plainData
    } catch (error) {
      console.error(`Error fetching ${resourceName} details:`, error)
      return {
        error: true,
        message: `Unable to fetch information for "${name}". Please try again or ask me to describe it based on my knowledge.`,
      }
    }
  }
}
