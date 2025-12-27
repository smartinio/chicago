import { Card } from './types'

type ConstantCardArray = ReadonlyArray<Readonly<Card>>

const SUITS = ['clubs', 'spades', 'hearts', 'diamonds'] as const
const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const

export const CARD_IDS = SUITS.flatMap((suit) => VALUES.map((value) => `${suit}:${value}` as const))

export const CARDS: ConstantCardArray = SUITS.flatMap((suit) =>
  VALUES.map((value): Card => ({ id: `${suit}:${value}`, suit, value }))
)

export const CARDS_BY_ID = CARDS.reduce((acc, card) => {
  acc[card.id] = card
  return acc
}, {} as Record<`${(typeof SUITS)[number]}:${(typeof VALUES)[number]}`, Readonly<Card>>)

export const MIN_PLAYER_COUNT = 2

export const MAX_PLAYER_COUNT = 4

export const WINNING_SCORE = 52
