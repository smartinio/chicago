import { last } from 'utils/last'
import { Card, Game, HandType, Player, Round, Suit, Trick, Value } from './types'

export const getNext = <T>(list: T[], predicate: (item: T) => boolean) => {
  const currentIndex = list.findIndex(predicate)
  const nextIndex = (currentIndex + 1) % list.length

  return list[nextIndex]
}

export const getPlayerNextTo = (current: Player, game: Game) => {
  return getNext(game.players, (p) => p.id === current.id)
}

export const getPlayersWithBestHand = (
  game: Game
): { player: Player; handType: HandType; points: number }[] => {
  const playerHandValues = game.players.map((player) => ({
    player,
    ...getPointsForHand(game, player.cards),
  }))

  const bestValue = Math.max(...playerHandValues.map((p) => p.points))

  return playerHandValues.filter(
    (p): p is { player: Player; handType: HandType; points: number } =>
      p.handType !== null && p.points === bestValue
  )
}

export const getPointsForHand = (
  game: Game,
  hand: Set<Card>
): { handType: HandType | null; points: number } => {
  const handType = getHandType(hand)

  if (!handType) {
    return { handType: null, points: 0 }
  }

  return { handType, points: game.rules.handPoints[handType] }
}

const getHandType = (hand: Set<Card>): HandType | undefined => {
  if (isRoyalStraightFlush(hand)) {
    return 'royalStraightFlush'
  }
  if (isStraightFlush(hand)) {
    return 'straightFlush'
  }
  if (isFourOfAKind(hand)) {
    return 'fourOfAKind'
  }
  if (isFullHouse(hand)) {
    return 'fullHouse'
  }
  if (isFlush(hand)) {
    return 'flush'
  }
  if (isStraight(hand)) {
    return 'straight'
  }
  if (isThreeOfAKind(hand)) {
    return 'threeOfAKind'
  }
  if (isTwoPair(hand)) {
    return 'twoPair'
  }
  if (isPair(hand)) {
    return 'pair'
  }
}

const isRoyalStraightFlush = (hand: Set<Card>): boolean => {
  return isStraightFlush(hand) && Array.from(hand).some((card) => card.value === 14)
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
  return isThreeOfAKind(hand) && isTwoPair(hand)
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
