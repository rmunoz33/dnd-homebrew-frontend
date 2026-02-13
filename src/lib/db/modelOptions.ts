import mongoose from 'mongoose'
import { getModelForClass, modelOptions, Severity } from '@typegoose/typegoose'

/**
 * HMR-safe model creation. Next.js dev server re-evaluates modules on hot reload,
 * which causes TypeGoose to throw "Cannot overwrite model once compiled".
 * This checks if the model already exists before creating it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrCreateModel<T extends new (...args: any[]) => any>(cl: T) {
  return mongoose.models[cl.name] || getModelForClass(cl)
}

function removeInternalFields(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeInternalFields)
  } else if (obj !== null && typeof obj === 'object') {
    const plainObject = typeof obj.toObject === 'function' ? obj.toObject() : obj

    const newObj: any = {}
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
