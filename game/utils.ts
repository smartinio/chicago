import { last } from '#utils/last'
import { Card, Game, HandType, Player, Round, Suit, Trick, Value } from './types'

export const getNext = <T>(list: T[], predicate: (item: T) => boolean) => {
  const currentIndex = list.findIndex(predicate)
  const nextIndex = (currentIndex + 1) % list.length

  return list[nextIndex]
}

export const getPlayerNextTo = (current: Player, game: Game) => {
  return getNext(game.players, (p) => p.id === current.id)
}

export type BestHand = { player: Player; handType: HandType; points: number; cards?: Card[] }

export const getPlayersWithBestHand = (game: Game): BestHand[] => {
  const playerHandValues = game.players.map((player) => ({
    player,
    ...getPointsForHand(game, getHand(game, player)),
  }))

  const bestValue = Math.max(...playerHandValues.map((p) => p.points))

  const candidates = playerHandValues.filter(
    (p): p is BestHand => p.handType !== null && p.points === bestValue
  )

  return tieBreak(candidates)
}

const getHand = (game: Game, player: Player): Set<Card> => {
  const hand = new Set(
    game.round.tricks.flatMap((trick) =>
      trick.playedCards
        .filter((played) => played.player.id === player.id)
        .map((played) => played.card)
    )
  )

  for (const card of Array.from(player.cards)) {
    hand.add(card)
  }

  return hand
}

export const tieBreak = (candidates: BestHand[]): BestHand[] => {
  if (candidates.length <= 1) return candidates

  let winners = [...candidates].map((c) => ({
    candidate: c,
    sortedValues: Array.from(c.player.cards)
      .map((card) => card.value)
      .sort((a, b) => b - a),
  }))

  for (let i = 0; i < 5 && winners.length > 1; i++) {
    const max = Math.max(...winners.map((w) => w.sortedValues[i]))
    winners = winners.filter((w) => w.sortedValues[i] === max)
  }

  return winners.map((w) => w.candidate)
}

export const getPointsForHand = (
  game: Game,
  hand: Set<Card>
): { handType: HandType | null; points: number; cards?: Card[] } => {
  const result = getHandTypeWithCards(hand)

  if (!result) {
    return { handType: null, points: 0 }
  }

  return {
    handType: result.handType,
    points: game.rules.handPoints[result.handType],
    cards: result.cards,
  }
}

const getHandTypeWithCards = (
  hand: Set<Card>
): { handType: HandType; cards: Card[] } | undefined => {
  const cards = Array.from(hand).sort((a, b) => b.value - a.value)

  // For hands where all 5 cards matter
  if (isRoyalStraightFlush(hand)) {
    return { handType: 'royalStraightFlush', cards }
  }
  if (isStraightFlush(hand)) {
    return { handType: 'straightFlush', cards }
  }
  if (isFullHouse(hand)) {
    return { handType: 'fullHouse', cards }
  }
  if (isFlush(hand)) {
    return { handType: 'flush', cards }
  }
  if (isStraight(hand)) {
    return { handType: 'straight', cards }
  }

  // For hands where only some cards matter
  if (isFourOfAKind(hand)) {
    return { handType: 'fourOfAKind', cards: getCardsOfAKind(hand, 4) }
  }
  if (isThreeOfAKind(hand)) {
    return { handType: 'threeOfAKind', cards: getCardsOfAKind(hand, 3) }
  }
  if (isTwoPair(hand)) {
    return { handType: 'twoPair', cards: getTwoPairCards(hand) }
  }
  if (isPair(hand)) {
    return { handType: 'pair', cards: getCardsOfAKind(hand, 2) }
  }
}

const getCardsOfAKind = (hand: Set<Card>, count: number): Card[] => {
  const cards = Array.from(hand)
  const targetValue = cards.find(
    (card) => cards.filter((c) => c.value === card.value).length === count
  )?.value

  return cards.filter((c) => c.value === targetValue).sort((a, b) => b.value - a.value)
}

const getTwoPairCards = (hand: Set<Card>): Card[] => {
  const cards = Array.from(hand)
  const pairValues = new Set<number>()

  for (const card of cards) {
    if (cards.filter((c) => c.value === card.value).length === 2) {
      pairValues.add(card.value)
    }
  }

  return cards.filter((c) => pairValues.has(c.value)).sort((a, b) => b.value - a.value)
}

const isRoyalStraightFlush = (hand: Set<Card>): boolean => {
  if (!isStraightFlush(hand)) return false
  const values = Array.from(hand).map((card) => card.value)
  // Royal straight flush must be 10-J-Q-K-A (values 10, 11, 12, 13, 14)
  return values.includes(10) && values.includes(14)
}

const isStraightFlush = (hand: Set<Card>): boolean => {
  return isFlush(hand) && isStraight(hand)
}

const isFlush = (hand: Set<Card>): boolean => {
  return Array.from(hand).every((card) => card.suit === Array.from(hand)[0].suit)
}

const isStraight = (hand: Set<Card>): boolean => {
  const cards = Array.from(hand).sort((a, b) => a.value - b.value)
  const ace = cards.find((card) => card.value === 14)
  const rest = cards.filter((card) => card !== ace)

  if (ace) {
    const str = rest.map((card) => card.value).join(',')
    return str === '2,3,4,5' || str === '10,11,12,13'
  }

  return rest.slice(0, -1).every((card, index) => card.value === rest[index + 1].value - 1)
}

const isFourOfAKind = (hand: Set<Card>): boolean => {
  return isNumberOfAKind(hand, 4)
}

const isFullHouse = (hand: Set<Card>): boolean => {
  const cards = Array.from(hand)
  const valueCounts = new Map<Value, number>()

  for (const card of cards) {
    valueCounts.set(card.value, (valueCounts.get(card.value) ?? 0) + 1)
  }

  const counts = Array.from(valueCounts.values()).sort((a, b) => b - a)
  return counts.length === 2 && counts[0] === 3 && counts[1] === 2
}

const isThreeOfAKind = (hand: Set<Card>): boolean => {
  return isNumberOfAKind(hand, 3)
}

const isTwoPair = (hand: Set<Card>): boolean => {
  const pair1 = Array.from(hand).find(
    (card) => Array.from(hand).filter((c) => c.value === card.value).length === 2
  )

  if (!pair1) {
    return false
  }

  const rest = Array.from(hand).filter((c) => c.value !== pair1.value)

  return isPair(new Set(rest))
}

const isPair = (hand: Set<Card>): boolean => {
  return isNumberOfAKind(hand, 2)
}

const isNumberOfAKind = (hand: Set<Card>, numberOfAKind: number): boolean => {
  return Array.from(hand).some(
    (card) => Array.from(hand).filter((c) => c.value === card.value).length === numberOfAKind
  )
}

export const createRound = (overrides: Partial<Round>): Round => {
  return {
    phase: 'throwing',
    tricks: [],
    throwCycles: [],
    ...overrides,
  }
}

export const createTrick = (overrides: Partial<Trick>): Trick => {
  return {
    playedCards: [],
    ...overrides,
  }
}

export const createPlayer = ({
  id,
  secret,
  name,
  ...overrides
}: { id: string; name: string; secret: string } & Partial<Player>): Player => {
  return {
    id,
    secret,
    name,
    cards: new Set(),
    score: 0,
    takenChicago: false,
    ...overrides,
  }
}

export const groupBySuit = (cards: Card[]) => {
  return cards.reduce((acc, card) => {
    acc[card.suit] = acc[card.suit] || []
    acc[card.suit].push(card)
    return acc
  }, {} as Record<Suit, Card[]>)
}

export const decideWinningPlayedCard = (params: { round: Round }) => {
  const trick = last(params.round.tricks)

  if (!trick) {
    throw new Error('No trick to decide winning played card for')
  }

  const [starter, ...playedCards] = trick.playedCards

  let best = starter

  for (const played of playedCards) {
    const playedSuit = played.card.suit
    const playedValue = played.card.value
    const bestSuit = best.card.suit
    const bestValue = best.card.value
    const isHigherThanBestCard = playedSuit === bestSuit && playedValue > bestValue

    if (isHigherThanBestCard) {
      best = played
    }
  }

  return { winning: best, trick }
}
