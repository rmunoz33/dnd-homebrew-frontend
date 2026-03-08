import { prop } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'
import { APIReference } from '@/lib/db/models/common/apiReference'
import { Damage } from '@/lib/db/models/common/damage'

export class ArmorClass {
  @prop({ required: true, index: true, type: () => Number })
  public base!: number

  @prop({ required: true, index: true, type: () => Boolean })
  public dex_bonus!: boolean

  @prop({ index: true, type: () => Number })
  public max_bonus?: number
}

export class Content {
  @prop({ type: () => APIReference })
  public item!: APIReference

  @prop({ required: true, index: true, type: () => Number })
  public quantity!: number
}

export class Cost {
  @prop({ required: true, index: true, type: () => Number })
  public quantity!: number

  @prop({ required: true, index: true, type: () => String })
  public unit!: string
}

export class Range {
  @prop({ index: true, type: () => Number })
  public long?: number

  @prop({ required: true, index: true, type: () => Number })
  public normal!: number
}

export class Speed {
  @prop({ required: true, index: true, type: () => Number })
  public quantity!: number

  @prop({ required: true, index: true, type: () => String })
  public unit!: string
}

export class ThrowRange {
  @prop({ required: true, index: true, type: () => Number })
  public long!: number

  @prop({ required: true, index: true, type: () => Number })
  public normal!: number
}

@srdModelOptions('2014-equipment')
export class Equipment {
  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, index: true, type: () => [String] })
  public desc?: string[]

  @prop({ type: () => APIReference })
  public equipment_category!: APIReference

  @prop({ type: () => APIReference })
  public gear_category?: APIReference

  @prop({ type: () => Cost })
  public cost!: Cost

  @prop({ index: true, type: () => Number })
  public weight?: number

  @prop({ index: true, type: () => String })
  public armor_category?: string

  @prop({ type: () => ArmorClass })
  public armor_class?: ArmorClass

  @prop({ index: true, type: () => String })
  public capacity?: string

  @prop({ index: true, type: () => String })
  public category_range?: string

  @prop({ type: () => [Content] })
  public contents?: Content[]

  @prop({ type: () => Damage })
  public damage?: Damage

  @prop({ index: true, type: () => String })
  public image?: string

  @prop({ type: () => [APIReference] })
  public properties?: APIReference[]

  @prop({ index: true, type: () => Number })
  public quantity?: number

  @prop({ type: () => Range })
  public range?: Range

  @prop({ index: true, type: () => [String] })
  public special?: string[]

  @prop({ type: () => Speed })
  public speed?: Speed

  @prop({ index: true, type: () => Boolean })
  public stealth_disadvantage?: boolean

  @prop({ index: true, type: () => Number })
  public str_minimum?: number

  @prop({ type: () => ThrowRange })
  public throw_range?: ThrowRange

  @prop({ index: true, type: () => String })
  public tool_category?: string

  @prop({ type: () => Damage })
  public two_handed_damage?: Damage

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ index: true, type: () => String })
  public vehicle_category?: string

  @prop({ index: true, type: () => String })
  public weapon_category?: string

  @prop({ index: true, type: () => String })
  public weapon_range?: string

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const EquipmentModel = getOrCreateModel(Equipment, '2014-equipment')
export default EquipmentModel
