import { prop } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'
import { APIReference } from '@/lib/db/models/common/apiReference'
import { Choice } from '@/lib/db/models/common/choice'

export class BackgroundFeatReference {
  @prop({ required: true, type: () => String })
  public index!: string

  @prop({ required: true, type: () => String })
  public name!: string

  @prop({ required: true, type: () => String })
  public url!: string

  @prop({ type: () => String })
  public note?: string
}

@srdModelOptions('2024-backgrounds')
export class Background2024 {
  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ type: () => [APIReference], required: true })
  public ability_scores!: APIReference[]

  @prop({ type: () => BackgroundFeatReference, required: true })
  public feat!: BackgroundFeatReference

  @prop({ type: () => [APIReference], required: true })
  public proficiencies!: APIReference[]

  @prop({ type: () => [Choice] })
  public proficiency_choices?: Choice[]

  @prop({ type: () => [Choice] })
  public equipment_options?: Choice[]

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const Background2024Model = getOrCreateModel(Background2024)
export default Background2024Model
