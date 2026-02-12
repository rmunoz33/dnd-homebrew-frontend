import { prop } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'
import { APIReference } from '@/lib/db/models/common/apiReference'

export class SubraceAbilityBonus {
  @prop({ type: () => APIReference, required: true })
  public ability_score!: APIReference

  @prop({ required: true, index: true, type: () => Number })
  public bonus!: number
}

@srdModelOptions('2014-subraces')
export class Subrace {
  @prop({ type: () => [SubraceAbilityBonus], required: true })
  public ability_bonuses!: SubraceAbilityBonus[]

  @prop({ required: true, index: true, type: () => String })
  public desc!: string

  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ type: () => APIReference, required: true })
  public race!: APIReference

  @prop({ type: () => [APIReference] })
  public racial_traits!: APIReference[]

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const SubraceModel = getOrCreateModel(Subrace)
export default SubraceModel
