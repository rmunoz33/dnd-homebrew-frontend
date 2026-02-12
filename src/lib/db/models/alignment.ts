import { prop } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'

@srdModelOptions('2014-alignments')
export class Alignment {
  @prop({ required: true, index: true, type: () => String })
  public desc!: string

  @prop({ required: true, index: true, type: () => String })
  public abbreviation!: string

  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const AlignmentModel = getOrCreateModel(Alignment)
export default AlignmentModel
