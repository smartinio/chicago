import { Card } from '#shared/types'

const valueMap = {
  2: 'TWO',
  3: 'THREE',
  4: 'FOUR',
  5: 'FIVE',
  6: 'SIX',
  7: 'SEVEN',
  8: 'EIGHT',
  9: 'NINE',
  10: 'TEN',
  11: 'JACK',
  12: 'QUEEN',
  13: 'KING',
  14: 'ACE',
} as const

const suits = ['CLUBS', 'DIAMONDS', 'HEARTS', 'SPADES'] as const
const values = ['TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'JACK', 'QUEEN', 'KING', 'ACE'] as const

// Generate all card URLs for preloading
export const cards = Object.fromEntries(
  values.flatMap(value =>
    suits.map(suit => [`${value}_${suit}`, `/cards/${value}_${suit}.svg`])
  )
) as Record<string, string>

const uppercase = <T extends string>(value: T): Uppercase<T> => {
  return value.toUpperCase() as Uppercase<T>
}

export const getCardSrc = (card: Card) => {
  const VALUE = valueMap[card.value]
  const SUIT = uppercase(card.suit)
  return `/cards/${VALUE}_${SUIT}.svg`
}
