import { prop } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'
import { APIReference } from '@/lib/db/models/common/apiReference'

@srdModelOptions('2024-proficiencies')
export class Proficiency2024 {
  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, index: true, type: () => String })
  public type!: string

  @prop({ type: () => [APIReference], required: true })
  public backgrounds!: APIReference[]

  @prop({ type: () => [APIReference], required: true })
  public classes!: APIReference[]

  @prop({ type: () => APIReference })
  public reference?: APIReference

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const Proficiency2024Model = getOrCreateModel(Proficiency2024)
export default Proficiency2024Model
