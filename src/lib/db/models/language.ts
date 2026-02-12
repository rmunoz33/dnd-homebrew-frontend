import { prop } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'

@srdModelOptions('2014-languages')
export class Language {
  @prop({ index: true, type: () => String })
  public desc?: string

  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ index: true, type: () => String })
  public script?: string

  @prop({ required: true, index: true, type: () => String })
  public type!: string

  @prop({ type: () => [String], index: true })
  public typical_speakers!: string[]

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const LanguageModel = getOrCreateModel(Language)
export default LanguageModel
