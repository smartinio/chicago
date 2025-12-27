import { Card } from 'shared/types'

const suitIndex = {
  clubs: 1,
  diamonds: 2,
  spades: 3,
  hearts: 4,
} as const

export const sortBySuitAndValue = (cards: Card[], direction: 'asc' | 'desc' = 'asc') => {
  const asc = (a: Card, b: Card) => a.value - b.value
  const desc = (a: Card, b: Card) => b.value - a.value

  return [...cards].sort(direction === 'asc' ? asc : desc).sort((a, b) => suitIndex[a.suit] - suitIndex[b.suit])
}
