import { prop } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'
import { Choice } from '@/lib/db/models/common/choice'

export class FeatPrerequisites2024 {
  @prop({ index: true, type: () => Number })
  public minimum_level?: number

  @prop({ index: true, type: () => String })
  public feature_named?: string
}

@srdModelOptions('2024-feats')
export class Feat2024 {
  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, type: () => String })
  public description!: string

  @prop({ required: true, index: true, type: () => String })
  public type!: string

  @prop({ index: true, type: () => String })
  public repeatable?: string

  @prop({ type: () => FeatPrerequisites2024 })
  public prerequisites?: FeatPrerequisites2024

  @prop({ type: () => Choice })
  public prerequisite_options?: Choice

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const Feat2024Model = getOrCreateModel(Feat2024, '2024-feats')
export default Feat2024Model
