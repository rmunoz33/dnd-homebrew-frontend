import mongoose from 'mongoose'
import { getModelForClass, modelOptions, Severity } from '@typegoose/typegoose'

/**
 * HMR-safe model creation with explicit collection name.
 *
 * Next.js/Turbopack minifies class names in server bundles, so cl.name returns
 * mangled values (e.g. "Race" → "e"). This causes different TypeGoose models to
 * collide in mongoose.models. Using the collection name as the model key avoids
 * this entirely.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrCreateModel<T extends new (...args: any[]) => any>(cl: T, collectionName: string) {
  return mongoose.models[collectionName] || getModelForClass(cl, {
    existingMongoose: mongoose,
    schemaOptions: { collection: collectionName },
    options: { customName: collectionName },
  })
}

interface WithToObject {
  toObject: () => Record<string, unknown>
}

function hasToObject(obj: object): obj is WithToObject {
  return 'toObject' in obj && typeof (obj as WithToObject).toObject === 'function'
}

function removeInternalFields(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(removeInternalFields)
  } else if (obj !== null && typeof obj === 'object') {
    const plainObject: Record<string, unknown> = hasToObject(obj) ? obj.toObject() : obj as Record<string, unknown>

    const newObj: Record<string, unknown> = {}
    for (const key in plainObject) {
      if (key !== '_id' && key !== '__v' && key !== 'id') {
        newObj[key] = removeInternalFields(plainObject[key])
      }
    }
    return newObj
  }
  return obj
}

export function srdModelOptions(collectionName: string): ClassDecorator {
  return modelOptions({
    options: { allowMixed: Severity.ALLOW },
    schemaOptions: {
      collection: collectionName,
      _id: false,
      timestamps: true,
      toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
          return removeInternalFields(ret)
        },
      },
      toObject: {
        virtuals: true,
        transform: (doc, ret) => {
          return removeInternalFields(ret)
        },
      },
    },
  })
}
