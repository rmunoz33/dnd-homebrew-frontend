import { modelOptions, prop, Severity } from '@typegoose/typegoose'

import { srdModelOptions, getOrCreateModel } from '@/lib/db/modelOptions'
import { APIReference } from '@/lib/db/models/common/apiReference'
import { Choice } from '@/lib/db/models/common/choice'
import { Damage } from '@/lib/db/models/common/damage'
import { DifficultyClass } from '@/lib/db/models/common/difficultyClass'

export class MonsterActionOption {
  @prop({ required: true, index: true, type: () => String })
  public action_name!: string

  @prop({ required: true, index: true, type: () => String })
  public count!: number | string

  @prop({ required: true, index: true, type: () => String })
  public type!: 'melee' | 'ranged' | 'ability' | 'magic'
}

export class ActionUsage {
  @prop({ required: true, index: true, type: () => String })
  public type!: string

  @prop({ index: true, type: () => String })
  public dice?: string

  @prop({ index: true, type: () => Number })
  public min_value?: number
}

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class MonsterAction {
  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, index: true, type: () => String })
  public desc!: string

  @prop({ index: true, type: () => Number })
  public attack_bonus?: number

  @prop({ type: () => [Object] })
  public damage?: (Damage | Choice)[]

  @prop({ type: () => DifficultyClass })
  public dc?: DifficultyClass

  @prop({ type: () => Choice })
  public options?: Choice

  @prop({ type: () => ActionUsage })
  public usage?: ActionUsage

  @prop({ required: true, index: true, type: () => String })
  public multiattack_type?: 'actions' | 'action_options'

  @prop({ type: () => [MonsterActionOption] })
  public actions?: MonsterActionOption[]

  @prop({ type: () => Choice })
  public action_options?: Choice
}

export class ArmorClassDex {
  @prop({ required: true, index: true, type: () => String })
  public type!: 'dex'

  @prop({ required: true, index: true, type: () => Number })
  public value!: number

  @prop({ index: true, type: () => String })
  public desc?: string
}

export class ArmorClassNatural {
  @prop({ required: true, index: true, type: () => String })
  public type!: 'natural'

  @prop({ required: true, index: true, type: () => Number })
  public value!: number

  @prop({ index: true, type: () => String })
  public desc?: string
}

export class ArmorClassArmor {
  @prop({ required: true, index: true, type: () => String })
  public type!: 'armor'

  @prop({ required: true, index: true, type: () => Number })
  public value!: number

  @prop({ type: () => [APIReference] })
  public armor?: APIReference[]

  @prop({ index: true, type: () => String })
  public desc?: string
}

export class ArmorClassSpell {
  @prop({ required: true, index: true, type: () => String })
  public type!: 'spell'

  @prop({ required: true, index: true, type: () => Number })
  public value!: number

  @prop({ type: () => APIReference })
  public spell!: APIReference

  @prop({ index: true, type: () => String })
  public desc?: string
}

export class ArmorClassCondition {
  @prop({ required: true, index: true, type: () => String })
  public type!: 'condition'

  @prop({ required: true, index: true, type: () => Number })
  public value!: number

  @prop({ type: () => APIReference })
  public condition!: APIReference

  @prop({ index: true, type: () => String })
  public desc?: string
}

export class LegendaryAction {
  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, index: true, type: () => String })
  public desc!: string

  @prop({ index: true, type: () => Number })
  public attack_bonus?: number

  @prop({ type: () => [Damage] })
  public damage?: Damage[]

  @prop({ type: () => DifficultyClass })
  public dc?: DifficultyClass
}

export class MonsterProficiency {
  @prop({ type: () => APIReference })
  public proficiency!: APIReference

  @prop({ required: true, index: true, type: () => Number })
  public value!: number
}

export class Reaction {
  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, index: true, type: () => String })
  public desc!: string

  @prop({ type: () => DifficultyClass })
  public dc?: DifficultyClass
}

export class Sense {
  @prop({ index: true, type: () => String })
  public blindsight?: string

  @prop({ index: true, type: () => String })
  public darkvision?: string

  @prop({ required: true, index: true, type: () => Number })
  public passive_perception!: number

  @prop({ index: true, type: () => String })
  public tremorsense?: string

  @prop({ index: true, type: () => String })
  public truesight?: string
}

export class SpecialAbilityUsage {
  @prop({ required: true, index: true, type: () => String })
  public type!: string

  @prop({ index: true, type: () => Number })
  public times?: number

  @prop({ type: () => [String] })
  public rest_types?: string[]
}

export class SpecialAbilitySpell {
  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, index: true, type: () => Number })
  public level!: number

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ index: true, type: () => String })
  public notes?: string

  @prop({ type: () => SpecialAbilityUsage })
  public usage?: SpecialAbilityUsage
}

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class SpecialAbilitySpellcasting {
  @prop({ index: true, type: () => Number })
  public level?: number

  @prop({ type: () => APIReference })
  public ability!: APIReference

  @prop({ index: true, type: () => Number })
  public dc?: number

  @prop({ index: true, type: () => Number })
  public modifier?: number

  @prop({ type: () => [String] })
  public components_required!: string[]

  @prop({ index: true, type: () => String })
  public school?: string

  @prop({ type: () => Object, default: undefined })
  public slots?: Record<string, number>

  @prop({ type: () => [SpecialAbilitySpell] })
  public spells!: SpecialAbilitySpell[]
}

export class SpecialAbility {
  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ required: true, index: true, type: () => String })
  public desc!: string

  @prop({ index: true, type: () => Number })
  public attack_bonus?: number

  @prop({ type: () => [Damage] })
  public damage?: Damage[]

  @prop({ type: () => DifficultyClass })
  public dc?: DifficultyClass

  @prop({ type: () => SpecialAbilitySpellcasting })
  public spellcasting?: SpecialAbilitySpellcasting

  @prop({ type: () => SpecialAbilityUsage })
  public usage?: SpecialAbilityUsage
}

export class MonsterSpeed {
  @prop({ index: true, type: () => String })
  public burrow?: string

  @prop({ index: true, type: () => String })
  public climb?: string

  @prop({ index: true, type: () => String })
  public fly?: string

  @prop({ index: true, type: () => Boolean })
  public hover?: boolean

  @prop({ index: true, type: () => String })
  public swim?: string

  @prop({ index: true, type: () => String })
  public walk?: string
}

@srdModelOptions('2014-monsters')
export class Monster {
  @prop({ type: () => [MonsterAction] })
  public actions?: MonsterAction[]

  @prop({ required: true, index: true, type: () => String })
  public alignment!: string

  @prop({
    type: () =>
      Array<
        ArmorClassDex | ArmorClassNatural | ArmorClassArmor | ArmorClassSpell | ArmorClassCondition
      >,
    required: true,
  })
  public armor_class!: Array<
    ArmorClassDex | ArmorClassNatural | ArmorClassArmor | ArmorClassSpell | ArmorClassCondition
  >

  @prop({ required: true, index: true, type: () => Number })
  public challenge_rating!: number

  @prop({ required: true, index: true, type: () => Number })
  public charisma!: number

  @prop({ type: () => [APIReference] })
  public condition_immunities!: APIReference[]

  @prop({ required: true, index: true, type: () => Number })
  public constitution!: number

  @prop({ type: () => [String] })
  public damage_immunities!: string[]

  @prop({ type: () => [String] })
  public damage_resistances!: string[]

  @prop({ type: () => [String] })
  public damage_vulnerabilities!: string[]

  @prop({ required: true, index: true, type: () => Number })
  public dexterity!: number

  @prop({ type: () => [APIReference] })
  public forms?: APIReference[]

  @prop({ required: true, index: true, type: () => String })
  public hit_dice!: string

  @prop({ required: true, index: true, type: () => Number })
  public hit_points!: number

  @prop({ required: true, index: true, type: () => String })
  public hit_points_roll!: string

  @prop({ index: true, type: () => String })
  public image?: string

  @prop({ required: true, index: true, type: () => String })
  public index!: string

  @prop({ required: true, index: true, type: () => Number })
  public intelligence!: number

  @prop({ required: true, index: true, type: () => String })
  public languages!: string

  @prop({ type: () => [LegendaryAction] })
  public legendary_actions?: LegendaryAction[]

  @prop({ required: true, index: true, type: () => String })
  public name!: string

  @prop({ type: () => [MonsterProficiency] })
  public proficiencies!: MonsterProficiency[]

  @prop({ type: () => [Reaction] })
  public reactions?: Reaction[]

  @prop({ type: () => Sense })
  public senses!: Sense

  @prop({ required: true, index: true, type: () => String })
  public size!: string

  @prop({ type: () => [SpecialAbility] })
  public special_abilities?: SpecialAbility[]

  @prop({ type: () => MonsterSpeed })
  public speed!: MonsterSpeed

  @prop({ required: true, index: true, type: () => Number })
  public strength!: number

  @prop({ index: true, type: () => String })
  public subtype?: string

  @prop({ required: true, index: true, type: () => String })
  public type!: string

  @prop({ required: true, index: true, type: () => String })
  public url!: string

  @prop({ required: true, index: true, type: () => Number })
  public wisdom!: number

  @prop({ required: true, index: true, type: () => Number })
  public xp!: number

  @prop({ required: true, index: true, type: () => String })
  public updated_at!: string
}

const MonsterModel = getOrCreateModel(Monster)
export default MonsterModel
