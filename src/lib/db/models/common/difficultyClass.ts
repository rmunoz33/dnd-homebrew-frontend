import { prop } from '@typegoose/typegoose'

import { APIReference } from '@/lib/db/models/common/apiReference'

export class DifficultyClass {
  @prop({ type: () => APIReference })
  public dc_type!: APIReference

  @prop({ required: true, index: true, type: () => Number })
  public dc_value!: number

  @prop({ required: true, index: true, type: () => String })
  public success_type!: 'none' | 'half' | 'other'
}
