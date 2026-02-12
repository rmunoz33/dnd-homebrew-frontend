import { prop } from '@typegoose/typegoose'

export class AreaOfEffect {
  @prop({ required: true, type: () => Number })
  public size!: number

  @prop({ required: true, index: true, type: () => String })
  public type!: 'sphere' | 'cube' | 'cylinder' | 'line' | 'cone'
}
