import { prop } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'
import { APIReference } from '@/lib/db/models/common/apiReference'

export class SubclassPrerequisite {
  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, type: () => String })
  public name!: string

  @prop({ required: true, type: () => String })
  public type!: string

  @prop({ required: true, type: () => String })
  public url!: string
}

export class SubclassSpell {
  @prop({ type: () => [SubclassPrerequisite], required: true })
  public prerequisites!: SubclassPrerequisite[]

  @prop({ type: () => APIReference, required: true })
  public spell!: APIReference
}

@srdModelOptions('2014-subclasses')
export class Subclass {
  @prop({ type: () => APIReference, required: true })
  public class!: APIReference

  @prop({ required: true, index: true, type: () => [String] })
  public desc!: string[]

  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ type: () => [SubclassSpell] })
  public spells?: SubclassSpell[]

  @prop({ required: true, index: true, type: () => String })
  public subclass_flavor!: string

  @prop({ required: true, index: true, type: () => String })
  public subclass_levels!: string

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const SubclassModel = getOrCreateModel(Subclass, '2014-subclasses')
export default SubclassModel
