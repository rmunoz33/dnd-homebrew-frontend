import { prop } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'
import { APIReference } from '@/lib/db/models/common/apiReference'
import { Choice } from '@/lib/db/models/common/choice'

export class RaceAbilityBonus {
  @prop({ type: () => APIReference, required: true })
  public ability_score!: APIReference

  @prop({ required: true, index: true, type: () => Number })
  public bonus!: number
}

@srdModelOptions('2014-races')
export class Race {
  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ type: () => Choice, required: false, index: true })
  public ability_bonus_options?: Choice

  @prop({ type: () => [RaceAbilityBonus], required: true })
  public ability_bonuses!: RaceAbilityBonus[]

  @prop({ required: true, index: true, type: () => String })
  public age!: string

  @prop({ required: true, index: true, type: () => String })
  public alignment!: string

  @prop({ required: true, index: true, type: () => String })
  public language_desc!: string

  @prop({ type: () => Choice })
  public language_options?: Choice

  @prop({ type: () => [APIReference], required: true })
  public languages!: APIReference[]

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, index: true, type: () => String })
  public size!: string

  @prop({ required: true, index: true, type: () => String })
  public size_description!: string

  @prop({ required: true, index: true, type: () => Number })
  public speed!: number

  @prop({ type: () => [APIReference] })
  public subraces?: APIReference[]

  @prop({ type: () => [APIReference] })
  public traits?: APIReference[]

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const RaceModel = getOrCreateModel(Race, '2014-races')
export default RaceModel
