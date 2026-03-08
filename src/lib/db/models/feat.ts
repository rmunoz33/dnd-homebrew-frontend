import { prop } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'
import { APIReference } from '@/lib/db/models/common/apiReference'

export class Prerequisite {
  @prop({ type: () => APIReference })
  public ability_score!: APIReference

  @prop({ required: true, index: true, type: () => Number })
  public minimum_score!: number
}

@srdModelOptions('2014-feats')
export class Feat {
  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ type: () => [Prerequisite] })
  public prerequisites!: Prerequisite[]

  @prop({ required: true, index: true, type: () => [String] })
  public desc!: string[]

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const FeatModel = getOrCreateModel(Feat, '2014-feats')
export default FeatModel
