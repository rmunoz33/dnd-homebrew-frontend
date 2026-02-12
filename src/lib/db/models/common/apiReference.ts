import { prop } from '@typegoose/typegoose'

export class APIReference {
  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, type: () => String })
  public name!: string

  @prop({ required: true, type: () => String })
  public url!: string
}
