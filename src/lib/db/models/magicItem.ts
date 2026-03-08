import { prop } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'
import { APIReference } from '@/lib/db/models/common/apiReference'

export class Rarity {
  @prop({ required: true, index: true, type: () => String })
  public name!: string
}

@srdModelOptions('2014-magic-items')
export class MagicItem {
  @prop({ type: () => [String], index: true })
  public desc!: string[]

  @prop({ type: () => APIReference, index: true })
  public equipment_category!: APIReference

  @prop({ type: () => String, index: true })
  public image?: string

  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, index: true, type: () => Rarity })
  public rarity!: Rarity

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ type: () => [APIReference], index: true })
  public variants!: APIReference[]

  @prop({ required: true, index: true, type: () => Boolean })
  public variant!: boolean

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const MagicItemModel = getOrCreateModel(MagicItem, '2014-magic-items')
export default MagicItemModel
