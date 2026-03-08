import { prop } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'
import { APIReference } from '@/lib/db/models/common/apiReference'
import { Choice } from '@/lib/db/models/common/choice'

export class EquipmentRef {
  @prop({ type: () => APIReference })
  public equipment!: APIReference

  @prop({ required: true, index: true, type: () => Number })
  public quantity!: number
}

class BackgroundFeature {
  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, index: true, type: () => [String] })
  public desc!: string[]
}

@srdModelOptions('2014-backgrounds')
export class Background {
  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ type: () => [APIReference] })
  public starting_proficiencies!: APIReference[]

  @prop({ type: () => Choice })
  public language_options!: Choice

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ type: () => [EquipmentRef] })
  public starting_equipment!: EquipmentRef[]

  @prop({ type: () => [Choice], index: true })
  public starting_equipment_options!: Choice[]

  @prop({ type: () => BackgroundFeature })
  public feature!: BackgroundFeature

  @prop({ type: () => Choice })
  public personality_traits!: Choice

  @prop({ type: () => Choice })
  public ideals!: Choice

  @prop({ type: () => Choice })
  public bonds!: Choice

  @prop({ type: () => Choice })
  public flaws!: Choice

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const BackgroundModel = getOrCreateModel(Background, '2014-backgrounds')
export default BackgroundModel
