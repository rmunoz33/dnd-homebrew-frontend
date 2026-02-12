import { prop } from '@typegoose/typegoose'

import { APIReference } from '@/lib/db/models/common/apiReference'

export class Damage {
  @prop({ type: () => APIReference })
  public damage_type!: APIReference

  @prop({ required: true, index: true, type: () => String })
  public damage_dice!: string
}
