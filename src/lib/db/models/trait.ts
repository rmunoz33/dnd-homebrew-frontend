import { modelOptions, prop, Severity } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'
import { APIReference } from '@/lib/db/models/common/apiReference'
import { AreaOfEffect } from '@/lib/db/models/common/areaOfEffect'
import { Choice } from '@/lib/db/models/common/choice'

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class ActionDamage {
  @prop({ type: () => APIReference })
  public damage_type!: APIReference

  @prop({ type: () => Object })
  public damage_at_character_level?: Record<string, string>
}

export class Usage {
  @prop({ required: true, index: true, type: () => String })
  public type!: string

  @prop({ required: true, index: true, type: () => Number })
  public times!: number
}

export class TraitActionDC {
  @prop({ type: () => APIReference, required: true })
  public dc_type!: APIReference

  @prop({ type: () => String, required: true })
  public success_type!: 'none' | 'half' | 'other'
}

export class Action {
  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, index: true, type: () => String })
  public desc!: string

  @prop({ type: () => Usage })
  public usage?: Usage

  @prop({ type: () => TraitActionDC })
  public dc?: TraitActionDC

  @prop({ type: () => [ActionDamage] })
  public damage?: ActionDamage[]

  @prop({ type: () => AreaOfEffect })
  public area_of_effect?: AreaOfEffect
}

export class TraitSpecific {
  @prop({ type: () => Choice })
  public subtrait_options?: Choice

  @prop({ type: () => Choice })
  public spell_options?: Choice

  @prop({ type: () => APIReference })
  public damage_type?: APIReference

  @prop({ type: () => Action })
  public breath_weapon?: Action
}

@srdModelOptions('2014-traits')
export class Trait {
  @prop({ required: true, index: true, type: () => [String] })
  public desc!: string[]

  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ type: () => [APIReference] })
  public proficiencies?: APIReference[]

  @prop({ type: () => Choice })
  public proficiency_choices?: Choice

  @prop({ type: () => Choice })
  public language_options?: Choice

  @prop({ type: () => [APIReference], required: true })
  public races!: APIReference[]

  @prop({ type: () => [APIReference], required: true })
  public subraces!: APIReference[]

  @prop({ type: () => APIReference })
  public parent?: APIReference

  @prop({ type: () => TraitSpecific })
  public trait_specific?: TraitSpecific

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const TraitModel = getOrCreateModel(Trait)
export default TraitModel
