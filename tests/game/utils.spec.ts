/**
 * Unit tests for game/utils.ts - Hand evaluation functions
 */

import { getPointsForHand, getPlayersWithBestHand, tieBreak } from '#game/utils'
import { CARDS_BY_ID } from '#game/constants'
import { Card } from '#game/types'
import { stubGame, stubPlayer } from '../fixtures'

// Helper to create a hand from card IDs
const hand = (...ids: (keyof typeof CARDS_BY_ID)[]): Set<Card> => {
  return new Set(ids.map((id) => CARDS_BY_ID[id]))
}

// Helper to set cards on a player (mutates the existing Set)
const setCards = (player: { cards: Set<Card> }, ...ids: (keyof typeof CARDS_BY_ID)[]) => {
  player.cards.clear()
  ids.forEach((id) => player.cards.add(CARDS_BY_ID[id]))
}

describe('getPointsForHand', () => {
  const game = stubGame()

  describe('High card (no poker hand)', () => {
    it('returns highCard handType and 0 points for high card only', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:5', 'spades:8', 'diamonds:10', 'clubs:13')
      )
      expect(result).toMatchObject({ handType: 'highCard', points: 0 })
      expect(result.cards).toHaveLength(5) // All cards for tiebreaking
    })

    it('returns highCard for non-consecutive, non-matching cards', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:3', 'hearts:6', 'spades:9', 'diamonds:12', 'clubs:14')
      )
      expect(result).toMatchObject({ handType: 'highCard', points: 0 })
      expect(result.cards?.[0].value).toBe(14) // Ace is highest
    })
  })

  describe('Pair', () => {
    it('detects a pair of 2s', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:2', 'spades:5', 'diamonds:8', 'clubs:11')
      )
      expect(result).toMatchObject({ handType: 'pair', points: 1 })
      expect(result.cards).toHaveLength(2)
    })

    it('detects a pair of Aces', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'hearts:14', 'spades:5', 'diamonds:8', 'clubs:11')
      )
      expect(result).toMatchObject({ handType: 'pair', points: 1 })
      expect(result.cards).toHaveLength(2)
    })

    it('detects a pair in the middle of the hand', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:3', 'hearts:7', 'spades:7', 'diamonds:10', 'clubs:13')
      )
      expect(result).toMatchObject({ handType: 'pair', points: 1 })
      expect(result.cards).toHaveLength(2)
    })
  })

  describe('Two Pair', () => {
    it('detects two pairs', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:4', 'hearts:4', 'spades:9', 'diamonds:9', 'clubs:12')
      )
      expect(result).toMatchObject({ handType: 'twoPair', points: 2 })
      expect(result.cards).toHaveLength(4)
    })

    it('detects two pairs with high and low values', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:2', 'spades:14', 'diamonds:14', 'clubs:7')
      )
      expect(result).toMatchObject({ handType: 'twoPair', points: 2 })
      expect(result.cards).toHaveLength(4)
    })

    it('detects two pairs regardless of order', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:5', 'hearts:8', 'spades:5', 'diamonds:8', 'clubs:11')
      )
      expect(result).toMatchObject({ handType: 'twoPair', points: 2 })
      expect(result.cards).toHaveLength(4)
    })
  })

  describe('Three of a Kind', () => {
    it('detects three of a kind', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:6', 'hearts:6', 'spades:6', 'diamonds:10', 'clubs:13')
      )
      expect(result).toMatchObject({ handType: 'threeOfAKind', points: 3 })
      expect(result.cards).toHaveLength(3)
    })

    it('detects three Aces', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'hearts:14', 'spades:14', 'diamonds:5', 'clubs:8')
      )
      expect(result).toMatchObject({ handType: 'threeOfAKind', points: 3 })
      expect(result.cards).toHaveLength(3)
    })

    it('detects three 2s', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:2', 'spades:2', 'diamonds:9', 'clubs:12')
      )
      expect(result).toMatchObject({ handType: 'threeOfAKind', points: 3 })
      expect(result.cards).toHaveLength(3)
    })
  })

  describe('Straight', () => {
    it('detects a straight (5-6-7-8-9)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:5', 'hearts:6', 'spades:7', 'diamonds:8', 'clubs:9')
      )
      expect(result).toMatchObject({ handType: 'straight', points: 4 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects a low straight (A-2-3-4-5)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'hearts:2', 'spades:3', 'diamonds:4', 'clubs:5')
      )
      expect(result).toMatchObject({ handType: 'straight', points: 4 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects a high straight (10-J-Q-K-A)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:10', 'hearts:11', 'spades:12', 'diamonds:13', 'clubs:14')
      )
      expect(result).toMatchObject({ handType: 'straight', points: 4 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects a straight regardless of suit order', () => {
      const result = getPointsForHand(
        game,
        hand('hearts:9', 'clubs:8', 'diamonds:7', 'spades:6', 'hearts:5')
      )
      expect(result).toMatchObject({ handType: 'straight', points: 4 })
      expect(result.cards).toHaveLength(5)
    })
  })

  describe('Flush', () => {
    it('detects a flush (all clubs)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'clubs:5', 'clubs:8', 'clubs:11', 'clubs:13')
      )
      expect(result).toMatchObject({ handType: 'flush', points: 5 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects a flush (all hearts)', () => {
      const result = getPointsForHand(
        game,
        hand('hearts:3', 'hearts:6', 'hearts:9', 'hearts:12', 'hearts:14')
      )
      expect(result).toMatchObject({ handType: 'flush', points: 5 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects a flush (all spades)', () => {
      const result = getPointsForHand(
        game,
        hand('spades:2', 'spades:4', 'spades:7', 'spades:10', 'spades:13')
      )
      expect(result).toMatchObject({ handType: 'flush', points: 5 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects a flush (all diamonds)', () => {
      const result = getPointsForHand(
        game,
        hand('diamonds:3', 'diamonds:5', 'diamonds:8', 'diamonds:11', 'diamonds:14')
      )
      expect(result).toMatchObject({ handType: 'flush', points: 5 })
      expect(result.cards).toHaveLength(5)
    })
  })

  describe('Full House', () => {
    it('detects a full house (three 8s and two Jacks)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:8', 'hearts:8', 'spades:8', 'diamonds:11', 'clubs:11')
      )
      expect(result).toMatchObject({ handType: 'fullHouse', points: 6 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects a full house (three Aces and two 2s)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'hearts:14', 'spades:14', 'diamonds:2', 'clubs:2')
      )
      expect(result).toMatchObject({ handType: 'fullHouse', points: 6 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects a full house (three 2s and two Kings)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:2', 'spades:2', 'diamonds:13', 'clubs:13')
      )
      expect(result).toMatchObject({ handType: 'fullHouse', points: 6 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects a full house regardless of card order', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:7', 'hearts:10', 'spades:7', 'diamonds:10', 'clubs:10')
      )
      expect(result).toMatchObject({ handType: 'fullHouse', points: 6 })
      expect(result.cards).toHaveLength(5)
    })

    it('correctly identifies full house over three of a kind', () => {
      // This was the bug: full house was being detected as three of a kind
      const result = getPointsForHand(
        game,
        hand('clubs:8', 'hearts:11', 'spades:8', 'diamonds:11', 'hearts:8')
      )
      expect(result).toMatchObject({ handType: 'fullHouse', points: 6 })
      expect(result.cards).toHaveLength(5)
    })
  })

  describe('Four of a Kind', () => {
    it('detects four of a kind', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:9', 'hearts:9', 'spades:9', 'diamonds:9', 'clubs:5')
      )
      expect(result).toMatchObject({ handType: 'fourOfAKind', points: 7 })
      expect(result.cards).toHaveLength(4)
    })

    it('detects four Aces', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'hearts:14', 'spades:14', 'diamonds:14', 'clubs:7')
      )
      expect(result).toMatchObject({ handType: 'fourOfAKind', points: 7 })
      expect(result.cards).toHaveLength(4)
    })

    it('detects four 2s', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:2', 'spades:2', 'diamonds:2', 'clubs:10')
      )
      expect(result).toMatchObject({ handType: 'fourOfAKind', points: 7 })
      expect(result.cards).toHaveLength(4)
    })
  })

  describe('Straight Flush', () => {
    it('detects a straight flush', () => {
      const result = getPointsForHand(
        game,
        hand('hearts:5', 'hearts:6', 'hearts:7', 'hearts:8', 'hearts:9')
      )
      expect(result).toMatchObject({ handType: 'straightFlush', points: 8 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects a low straight flush (A-2-3-4-5 same suit)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'clubs:2', 'clubs:3', 'clubs:4', 'clubs:5')
      )
      expect(result).toMatchObject({ handType: 'straightFlush', points: 8 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects straight flush in different suits', () => {
      const result = getPointsForHand(
        game,
        hand('spades:6', 'spades:7', 'spades:8', 'spades:9', 'spades:10')
      )
      expect(result).toMatchObject({ handType: 'straightFlush', points: 8 })
      expect(result.cards).toHaveLength(5)
    })
  })

  describe('Royal Straight Flush', () => {
    it('detects a royal straight flush (10-J-Q-K-A same suit)', () => {
      const result = getPointsForHand(
        game,
        hand('hearts:10', 'hearts:11', 'hearts:12', 'hearts:13', 'hearts:14')
      )
      expect(result).toMatchObject({ handType: 'royalStraightFlush', points: 52 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects royal flush in clubs', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:10', 'clubs:11', 'clubs:12', 'clubs:13', 'clubs:14')
      )
      expect(result).toMatchObject({ handType: 'royalStraightFlush', points: 52 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects royal flush in spades', () => {
      const result = getPointsForHand(
        game,
        hand('spades:10', 'spades:11', 'spades:12', 'spades:13', 'spades:14')
      )
      expect(result).toMatchObject({ handType: 'royalStraightFlush', points: 52 })
      expect(result.cards).toHaveLength(5)
    })

    it('detects royal flush in diamonds', () => {
      const result = getPointsForHand(
        game,
        hand('diamonds:10', 'diamonds:11', 'diamonds:12', 'diamonds:13', 'diamonds:14')
      )
      expect(result).toMatchObject({ handType: 'royalStraightFlush', points: 52 })
      expect(result.cards).toHaveLength(5)
    })
  })

  describe('Hand ranking priority', () => {
    it('ranks royal straight flush higher than straight flush', () => {
      const royalFlush = getPointsForHand(
        game,
        hand('hearts:10', 'hearts:11', 'hearts:12', 'hearts:13', 'hearts:14')
      )
      const straightFlush = getPointsForHand(
        game,
        hand('hearts:5', 'hearts:6', 'hearts:7', 'hearts:8', 'hearts:9')
      )
      expect(royalFlush.points).toBeGreaterThan(straightFlush.points)
    })

    it('ranks straight flush higher than four of a kind', () => {
      const straightFlush = getPointsForHand(
        game,
        hand('hearts:5', 'hearts:6', 'hearts:7', 'hearts:8', 'hearts:9')
      )
      const fourOfAKind = getPointsForHand(
        game,
        hand('clubs:9', 'hearts:9', 'spades:9', 'diamonds:9', 'clubs:5')
      )
      expect(straightFlush.points).toBeGreaterThan(fourOfAKind.points)
    })

    it('ranks four of a kind higher than full house', () => {
      const fourOfAKind = getPointsForHand(
        game,
        hand('clubs:9', 'hearts:9', 'spades:9', 'diamonds:9', 'clubs:5')
      )
      const fullHouse = getPointsForHand(
        game,
        hand('clubs:8', 'hearts:8', 'spades:8', 'diamonds:11', 'clubs:11')
      )
      expect(fourOfAKind.points).toBeGreaterThan(fullHouse.points)
    })

    it('ranks full house higher than flush', () => {
      const fullHouse = getPointsForHand(
        game,
        hand('clubs:8', 'hearts:8', 'spades:8', 'diamonds:11', 'clubs:11')
      )
      const flush = getPointsForHand(
        game,
        hand('clubs:2', 'clubs:5', 'clubs:8', 'clubs:11', 'clubs:13')
      )
      expect(fullHouse.points).toBeGreaterThan(flush.points)
    })

    it('ranks flush higher than straight', () => {
      const flush = getPointsForHand(
        game,
        hand('clubs:2', 'clubs:5', 'clubs:8', 'clubs:11', 'clubs:13')
      )
      const straight = getPointsForHand(
        game,
        hand('clubs:5', 'hearts:6', 'spades:7', 'diamonds:8', 'clubs:9')
      )
      expect(flush.points).toBeGreaterThan(straight.points)
    })

    it('ranks straight higher than three of a kind', () => {
      const straight = getPointsForHand(
        game,
        hand('clubs:5', 'hearts:6', 'spades:7', 'diamonds:8', 'clubs:9')
      )
      const threeOfAKind = getPointsForHand(
        game,
        hand('clubs:6', 'hearts:6', 'spades:6', 'diamonds:10', 'clubs:13')
      )
      expect(straight.points).toBeGreaterThan(threeOfAKind.points)
    })

    it('ranks three of a kind higher than two pair', () => {
      const threeOfAKind = getPointsForHand(
        game,
        hand('clubs:6', 'hearts:6', 'spades:6', 'diamonds:10', 'clubs:13')
      )
      const twoPair = getPointsForHand(
        game,
        hand('clubs:4', 'hearts:4', 'spades:9', 'diamonds:9', 'clubs:12')
      )
      expect(threeOfAKind.points).toBeGreaterThan(twoPair.points)
    })

    it('ranks two pair higher than pair', () => {
      const twoPair = getPointsForHand(
        game,
        hand('clubs:4', 'hearts:4', 'spades:9', 'diamonds:9', 'clubs:12')
      )
      const pair = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:2', 'spades:5', 'diamonds:8', 'clubs:11')
      )
      expect(twoPair.points).toBeGreaterThan(pair.points)
    })

    it('ranks pair higher than high card', () => {
      const pair = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:2', 'spades:5', 'diamonds:8', 'clubs:11')
      )
      const highCard = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:5', 'spades:8', 'diamonds:10', 'clubs:13')
      )
      expect(pair.points).toBeGreaterThan(highCard.points)
    })
  })

  describe('Edge cases', () => {
    it('does not detect a straight for A-K-Q-J-9 (gap at 10)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'hearts:13', 'spades:12', 'diamonds:11', 'clubs:9')
      )
      // This should not be a straight, just high card
      expect(result.handType).not.toBe('straight')
    })

    it('does not detect a flush for 4 same suit + 1 different', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'clubs:5', 'clubs:8', 'clubs:11', 'hearts:13')
      )
      expect(result.handType).not.toBe('flush')
    })

    it('does not confuse full house with two pair when only 2+2 exist', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:4', 'hearts:4', 'spades:9', 'diamonds:9', 'clubs:12')
      )
      expect(result.handType).toBe('twoPair')
    })
  })
})

describe('getPlayersWithBestHand', () => {
  it('returns the player with the best hand', () => {
    const game = stubGame()
    const [p1, p2, p3, p4] = game.players

    // P1: pair
    setCards(p1, 'clubs:2', 'hearts:2', 'spades:5', 'diamonds:8', 'clubs:11')
    // P2: three of a kind
    setCards(p2, 'clubs:6', 'hearts:6', 'spades:6', 'diamonds:10', 'clubs:13')
    // P3: high card
    setCards(p3, 'clubs:3', 'hearts:5', 'spades:8', 'diamonds:10', 'clubs:13')
    // P4: two pair
    setCards(p4, 'clubs:4', 'hearts:4', 'spades:9', 'diamonds:9', 'clubs:12')

    const result = getPlayersWithBestHand(game)
    expect(result).toHaveLength(1)
    expect(result[0].player.id).toBe(p2.id)
    expect(result[0].handType).toBe('threeOfAKind')
    expect(result[0].points).toBe(3)
  })

  it('returns winner when tied on hand type but wins tiebreaker', () => {
    const game = stubGame()
    const [p1, p2, p3, p4] = game.players

    // P1: pair of 9s with Ace kicker
    setCards(p1, 'clubs:9', 'hearts:9', 'spades:14', 'diamonds:5', 'clubs:2')
    // P2: pair of 9s with King kicker
    setCards(p2, 'spades:9', 'diamonds:9', 'clubs:13', 'hearts:5', 'diamonds:2')
    // P3: high card only
    setCards(p3, 'clubs:3', 'hearts:6', 'spades:8', 'diamonds:10', 'clubs:12')
    // P4: high card only
    setCards(p4, 'clubs:4', 'hearts:7', 'spades:10', 'diamonds:12', 'clubs:14')

    const result = getPlayersWithBestHand(game)
    // P1 should win the tiebreak with the Ace kicker
    expect(result).toHaveLength(1)
    expect(result[0].player.id).toBe(p1.id)
  })

  it('higher pair beats lower pair even when lower pair has higher kicker (Sam vs Jesus bug)', () => {
    const game = stubGame()
    const [p1, p2, p3, p4] = game.players

    // P1 (Sam): pair of 6s - 4♣, J♣, 6♦, 6♠, 9♥
    setCards(p1, 'clubs:4', 'clubs:11', 'diamonds:6', 'spades:6', 'hearts:9')
    // P2 (Jesus): pair of 3s - 3♠, 2♦, A♦, 3♠, 9♠ (note: using different 3s for test)
    setCards(p2, 'spades:3', 'diamonds:2', 'diamonds:14', 'clubs:3', 'spades:9')
    // P3: high card only
    setCards(p3, 'clubs:5', 'hearts:7', 'spades:8', 'diamonds:10', 'clubs:12')
    // P4: high card only
    setCards(p4, 'clubs:7', 'hearts:8', 'spades:10', 'diamonds:12', 'clubs:13')

    const result = getPlayersWithBestHand(game)
    // P1 (Sam) should win because pair of 6s beats pair of 3s
    // Even though P2 (Jesus) has an Ace kicker
    expect(result).toHaveLength(1)
    expect(result[0].player.id).toBe(p1.id)
    expect(result[0].handType).toBe('pair')
  })
})

describe('tieBreak', () => {
  // Helper to create a BestHand candidate with fullHand from player's cards
  const createCandidate = (player: ReturnType<typeof stubPlayer>) => ({
    player,
    handType: 'pair' as const,
    points: 1,
    cards: Array.from(player.cards),
    fullHand: Array.from(player.cards),
  })

  it('returns single candidate when no tie', () => {
    const player = stubPlayer({ id: 'p1' })
    setCards(player, 'clubs:14', 'hearts:13', 'spades:12', 'diamonds:11', 'clubs:9')

    const candidates = [createCandidate(player)]
    const { winners } = tieBreak(candidates)

    expect(winners).toHaveLength(1)
  })

  it('breaks tie by highest card', () => {
    const p1 = stubPlayer({ id: 'p1' })
    const p2 = stubPlayer({ id: 'p2' })

    // P1 has Ace high
    setCards(p1, 'clubs:14', 'hearts:5', 'spades:6', 'diamonds:7', 'clubs:8')
    // P2 has King high
    setCards(p2, 'clubs:13', 'hearts:5', 'spades:6', 'diamonds:7', 'clubs:8')

    const candidates = [createCandidate(p1), createCandidate(p2)]
    const { winners, cardsCompared } = tieBreak(candidates)

    expect(winners).toHaveLength(1)
    expect(winners[0].player.id).toBe('p1')
    expect(cardsCompared).toBe(1) // First card broke the tie
  })

  it('uses second highest card when first is tied', () => {
    const p1 = stubPlayer({ id: 'p1' })
    const p2 = stubPlayer({ id: 'p2' })

    // Both have Ace, but P1 has King as second
    setCards(p1, 'clubs:14', 'hearts:13', 'spades:6', 'diamonds:7', 'clubs:8')
    // P2 has Queen as second
    setCards(p2, 'spades:14', 'hearts:12', 'diamonds:6', 'clubs:7', 'hearts:8')

    const candidates = [createCandidate(p1), createCandidate(p2)]
    const { winners, cardsCompared } = tieBreak(candidates)

    expect(winners).toHaveLength(1)
    expect(winners[0].player.id).toBe('p1')
    expect(cardsCompared).toBe(2) // Second card broke the tie
  })

  it('returns all candidates when completely tied', () => {
    const p1 = stubPlayer({ id: 'p1' })
    const p2 = stubPlayer({ id: 'p2' })

    // Identical values (different suits)
    setCards(p1, 'clubs:14', 'hearts:13', 'spades:12', 'diamonds:11', 'clubs:10')
    setCards(p2, 'spades:14', 'diamonds:13', 'hearts:12', 'clubs:11', 'hearts:10')

    const candidates = [createCandidate(p1), createCandidate(p2)]
    const { winners, cardsCompared } = tieBreak(candidates)

    expect(winners).toHaveLength(2)
    expect(cardsCompared).toBe(5) // All cards compared, still tied
  })

  it('returns empty array for empty input', () => {
    const { winners } = tieBreak([])
    expect(winners).toHaveLength(0)
  })
})

/**
 * Comprehensive hand comparison test matrix
 * Tests 1v1 matchups between different hand combinations
 */
describe('Hand comparison matrix (1v1 matchups)', () => {
  // Helper to run a 1v1 comparison and return the winner
  // Returns 'p1', 'p2', or 'tie' for easy comparison in tests
  // Uses 2-player game to avoid card conflicts with dummy hands
  const runMatchup = (
    p1Cards: (keyof typeof CARDS_BY_ID)[],
    p2Cards: (keyof typeof CARDS_BY_ID)[]
  ): { winnerId: 'p1' | 'p2' | 'tie'; p1Hand: string; p2Hand: string } => {
    const game = stubGame({ numPlayers: 2 })
    const [p1, p2] = game.players

    setCards(p1, ...p1Cards)
    setCards(p2, ...p2Cards)

    const result = getPlayersWithBestHand(game)

    if (result.length === 1) {
      const winnerId = result[0].player.id === p1.id ? 'p1' : 'p2'
      return {
        winnerId,
        p1Hand: result[0].player.id === p1.id ? result[0].handType : '',
        p2Hand: result[0].player.id === p2.id ? result[0].handType : '',
      }
    }

    // Both players tied
    return {
      winnerId: 'tie',
      p1Hand: result.find((r) => r.player.id === p1.id)?.handType ?? '',
      p2Hand: result.find((r) => r.player.id === p2.id)?.handType ?? '',
    }
  }

  describe('Pair vs Pair', () => {
    it.each`
      description                                     | p1Cards                                                            | p2Cards                                                               | expectedWinner
      ${'Higher pair (Aces vs Kings)'}                | ${['clubs:14', 'hearts:14', 'spades:5', 'diamonds:8', 'clubs:11']} | ${['clubs:13', 'hearts:13', 'spades:5', 'diamonds:8', 'spades:11']}   | ${'p1'}
      ${'Higher pair (Kings vs Queens)'}              | ${['clubs:13', 'hearts:13', 'spades:5', 'diamonds:8', 'clubs:11']} | ${['clubs:12', 'hearts:12', 'spades:5', 'diamonds:8', 'spades:11']}   | ${'p1'}
      ${'Higher pair (6s vs 3s) - Sam vs Jesus bug'}  | ${['clubs:4', 'clubs:11', 'diamonds:6', 'spades:6', 'hearts:9']}   | ${['spades:3', 'diamonds:2', 'diamonds:14', 'clubs:3', 'spades:9']}   | ${'p1'}
      ${'Lower pair with Ace kicker loses to higher'} | ${['clubs:2', 'hearts:2', 'spades:14', 'diamonds:13', 'clubs:12']} | ${['clubs:10', 'hearts:10', 'spades:5', 'diamonds:4', 'clubs:3']}     | ${'p2'}
      ${'Same pair, higher kicker wins'}              | ${['clubs:9', 'hearts:9', 'spades:14', 'diamonds:5', 'clubs:2']}   | ${['spades:9', 'diamonds:9', 'clubs:13', 'hearts:5', 'diamonds:2']}   | ${'p1'}
      ${'Same pair, second kicker decides'}           | ${['clubs:8', 'hearts:8', 'spades:14', 'diamonds:13', 'clubs:2']}  | ${['spades:8', 'diamonds:8', 'clubs:14', 'hearts:12', 'diamonds:2']}  | ${'p1'}
      ${'Same pair, third kicker decides'}            | ${['clubs:7', 'hearts:7', 'spades:14', 'diamonds:13', 'clubs:12']} | ${['spades:7', 'diamonds:7', 'clubs:14', 'hearts:13', 'diamonds:11']} | ${'p1'}
      ${'Same pair and kickers = tie'}                | ${['clubs:6', 'hearts:6', 'spades:14', 'diamonds:13', 'clubs:12']} | ${['spades:6', 'diamonds:6', 'clubs:14', 'hearts:13', 'diamonds:12']} | ${'tie'}
      ${'Pair of 2s vs pair of 3s'}                   | ${['clubs:2', 'hearts:2', 'spades:14', 'diamonds:13', 'clubs:12']} | ${['clubs:3', 'hearts:3', 'spades:5', 'diamonds:4', 'clubs:6']}       | ${'p2'}
    `('$description', ({ p1Cards, p2Cards, expectedWinner }) => {
      const result = runMatchup(p1Cards, p2Cards)
      expect(result.winnerId).toBe(expectedWinner)
    })
  })

  describe('Two Pair vs Two Pair', () => {
    it.each`
      description                                 | p1Cards                                                              | p2Cards                                                                 | expectedWinner
      ${'Higher top pair wins (KK+22 vs QQ+JJ)'}  | ${['clubs:13', 'hearts:13', 'spades:2', 'diamonds:2', 'clubs:5']}    | ${['clubs:12', 'hearts:12', 'spades:11', 'diamonds:11', 'clubs:5']}     | ${'p1'}
      ${'Same top pair, higher second pair wins'} | ${['clubs:14', 'hearts:14', 'spades:10', 'diamonds:10', 'clubs:5']}  | ${['spades:14', 'diamonds:14', 'clubs:9', 'hearts:9', 'diamonds:5']}    | ${'p1'}
      ${'Same two pairs, kicker decides'}         | ${['clubs:13', 'hearts:13', 'spades:10', 'diamonds:10', 'clubs:14']} | ${['spades:13', 'diamonds:13', 'clubs:10', 'hearts:10', 'diamonds:12']} | ${'p1'}
      ${'Same two pairs, same kicker = tie'}      | ${['clubs:12', 'hearts:12', 'spades:8', 'diamonds:8', 'clubs:14']}   | ${['spades:12', 'diamonds:12', 'clubs:8', 'hearts:8', 'diamonds:14']}   | ${'tie'}
      ${'AA+KK beats AA+QQ'}                      | ${['clubs:14', 'hearts:14', 'spades:13', 'diamonds:13', 'clubs:5']}  | ${['spades:14', 'diamonds:14', 'clubs:12', 'hearts:12', 'diamonds:5']}  | ${'p1'}
      ${'33+22 loses to 44+33'}                   | ${['clubs:3', 'hearts:3', 'spades:2', 'diamonds:2', 'clubs:14']}     | ${['clubs:4', 'hearts:4', 'spades:3', 'diamonds:3', 'clubs:5']}         | ${'p2'}
    `('$description', ({ p1Cards, p2Cards, expectedWinner }) => {
      const result = runMatchup(p1Cards, p2Cards)
      expect(result.winnerId).toBe(expectedWinner)
    })
  })

  describe('Three of a Kind vs Three of a Kind', () => {
    it.each`
      description                            | p1Cards                                                            | p2Cards                                                              | expectedWinner
      ${'Higher trips (AAA vs KKK)'}         | ${['clubs:14', 'hearts:14', 'spades:14', 'diamonds:5', 'clubs:8']} | ${['clubs:13', 'hearts:13', 'spades:13', 'diamonds:5', 'clubs:8']}   | ${'p1'}
      ${'Higher trips (999 vs 888)'}         | ${['clubs:9', 'hearts:9', 'spades:9', 'diamonds:5', 'clubs:8']}    | ${['clubs:8', 'hearts:8', 'spades:8', 'diamonds:5', 'clubs:9']}      | ${'p1'}
      ${'222 loses to 333'}                  | ${['clubs:2', 'hearts:2', 'spades:2', 'diamonds:14', 'clubs:13']}  | ${['clubs:3', 'hearts:3', 'spades:3', 'diamonds:5', 'clubs:6']}      | ${'p2'}
      ${'Same trips, higher kicker wins'}    | ${['clubs:7', 'hearts:7', 'spades:7', 'diamonds:14', 'clubs:5']}   | ${['diamonds:7', 'clubs:7', 'hearts:7', 'spades:13', 'diamonds:5']}  | ${'p1'}
      ${'Same trips, second kicker decides'} | ${['clubs:6', 'hearts:6', 'spades:6', 'diamonds:14', 'clubs:13']}  | ${['diamonds:6', 'clubs:6', 'hearts:6', 'spades:14', 'diamonds:12']} | ${'p1'}
    `('$description', ({ p1Cards, p2Cards, expectedWinner }) => {
      const result = runMatchup(p1Cards, p2Cards)
      expect(result.winnerId).toBe(expectedWinner)
    })
  })

  describe('Straight vs Straight', () => {
    it.each`
      description                             | p1Cards                                                               | p2Cards                                                               | expectedWinner
      ${'Higher straight (10-A vs 9-K)'}      | ${['clubs:10', 'hearts:11', 'spades:12', 'diamonds:13', 'clubs:14']}  | ${['clubs:9', 'hearts:10', 'spades:11', 'diamonds:12', 'clubs:13']}   | ${'p1'}
      ${'Higher straight (6-10 vs 5-9)'}      | ${['clubs:6', 'hearts:7', 'spades:8', 'diamonds:9', 'clubs:10']}      | ${['clubs:5', 'hearts:6', 'spades:7', 'diamonds:8', 'clubs:9']}       | ${'p1'}
      ${'Same straight = tie'}                | ${['clubs:8', 'hearts:9', 'spades:10', 'diamonds:11', 'clubs:12']}    | ${['spades:8', 'diamonds:9', 'clubs:10', 'hearts:11', 'diamonds:12']} | ${'tie'}
      ${'Broadway (10-A) beats 9-K'}          | ${['clubs:10', 'hearts:11', 'spades:12', 'diamonds:13', 'hearts:14']} | ${['clubs:9', 'hearts:10', 'spades:11', 'diamonds:12', 'clubs:13']}   | ${'p1'}
      ${'Wheel (A-5) loses to 2-6 straight'}  | ${['clubs:14', 'hearts:2', 'spades:3', 'diamonds:4', 'clubs:5']}      | ${['clubs:2', 'hearts:3', 'spades:4', 'diamonds:5', 'clubs:6']}       | ${'p2'}
      ${'Wheel (A-5) is the lowest straight'} | ${['clubs:14', 'hearts:2', 'spades:3', 'diamonds:4', 'clubs:5']}      | ${['clubs:6', 'hearts:7', 'spades:8', 'diamonds:9', 'clubs:10']}      | ${'p2'}
      ${'Two wheels = tie'}                   | ${['clubs:14', 'hearts:2', 'spades:3', 'diamonds:4', 'clubs:5']}      | ${['spades:14', 'diamonds:2', 'clubs:3', 'hearts:4', 'spades:5']}     | ${'tie'}
    `('$description', ({ p1Cards, p2Cards, expectedWinner }) => {
      const result = runMatchup(p1Cards, p2Cards)
      expect(result.winnerId).toBe(expectedWinner)
    })
  })

  describe('Flush vs Flush', () => {
    it.each`
      description                             | p1Cards                                                       | p2Cards                                                            | expectedWinner
      ${'Higher flush (A high vs K high)'}    | ${['clubs:14', 'clubs:10', 'clubs:8', 'clubs:5', 'clubs:3']}  | ${['hearts:13', 'hearts:10', 'hearts:8', 'hearts:5', 'hearts:3']}  | ${'p1'}
      ${'Same high, second card decides'}     | ${['clubs:14', 'clubs:13', 'clubs:8', 'clubs:5', 'clubs:3']}  | ${['hearts:14', 'hearts:12', 'hearts:8', 'hearts:5', 'hearts:3']}  | ${'p1'}
      ${'Same first two, third card decides'} | ${['clubs:14', 'clubs:13', 'clubs:12', 'clubs:5', 'clubs:3']} | ${['hearts:14', 'hearts:13', 'hearts:11', 'hearts:5', 'hearts:3']} | ${'p1'}
      ${'Same flush values = tie'}            | ${['clubs:14', 'clubs:12', 'clubs:10', 'clubs:8', 'clubs:6']} | ${['hearts:14', 'hearts:12', 'hearts:10', 'hearts:8', 'hearts:6']} | ${'tie'}
      ${'Low flush loses to high flush'}      | ${['clubs:9', 'clubs:7', 'clubs:5', 'clubs:4', 'clubs:2']}    | ${['hearts:14', 'hearts:5', 'hearts:4', 'hearts:3', 'hearts:2']}   | ${'p2'}
    `('$description', ({ p1Cards, p2Cards, expectedWinner }) => {
      const result = runMatchup(p1Cards, p2Cards)
      expect(result.winnerId).toBe(expectedWinner)
    })
  })

  describe('Full House vs Full House', () => {
    it.each`
      description                                     | p1Cards                                                               | p2Cards                                                              | expectedWinner
      ${'Higher trips wins (AAA+KK vs QQQ+JJ)'}       | ${['clubs:14', 'hearts:14', 'spades:14', 'diamonds:13', 'hearts:13']} | ${['clubs:12', 'hearts:12', 'spades:12', 'diamonds:11', 'clubs:11']} | ${'p1'}
      ${'Higher trips wins (999+33 vs 888+44)'}       | ${['clubs:9', 'hearts:9', 'spades:9', 'diamonds:3', 'clubs:3']}       | ${['clubs:8', 'hearts:8', 'spades:8', 'diamonds:4', 'clubs:4']}      | ${'p1'}
      ${'222+KK loses to 333+44 (trips matter most)'} | ${['clubs:2', 'hearts:2', 'spades:2', 'diamonds:13', 'hearts:13']}    | ${['clubs:3', 'hearts:3', 'spades:3', 'diamonds:4', 'clubs:4']}      | ${'p2'}
      ${'JJJ+33 beats 1010+44 (trips > pair)'}        | ${['clubs:11', 'hearts:11', 'spades:11', 'diamonds:3', 'clubs:3']}    | ${['clubs:10', 'hearts:10', 'spades:10', 'diamonds:4', 'clubs:4']}   | ${'p1'}
    `('$description', ({ p1Cards, p2Cards, expectedWinner }) => {
      const result = runMatchup(p1Cards, p2Cards)
      expect(result.winnerId).toBe(expectedWinner)
    })
  })

  describe('Four of a Kind vs Four of a Kind', () => {
    it.each`
      description                      | p1Cards                                                             | p2Cards                                                             | expectedWinner
      ${'Higher quads (AAAA vs KKKK)'} | ${['clubs:14', 'hearts:14', 'spades:14', 'diamonds:14', 'clubs:5']} | ${['clubs:13', 'hearts:13', 'spades:13', 'diamonds:13', 'clubs:5']} | ${'p1'}
      ${'Higher quads (9999 vs 8888)'} | ${['clubs:9', 'hearts:9', 'spades:9', 'diamonds:9', 'clubs:5']}     | ${['clubs:8', 'hearts:8', 'spades:8', 'diamonds:8', 'clubs:5']}     | ${'p1'}
      ${'Same quads, kicker decides'}  | ${['clubs:7', 'hearts:7', 'spades:7', 'diamonds:7', 'clubs:14']}    | ${['clubs:7', 'hearts:7', 'spades:7', 'diamonds:7', 'clubs:13']}    | ${'p1'}
      ${'2222 loses to 3333'}          | ${['clubs:2', 'hearts:2', 'spades:2', 'diamonds:2', 'clubs:14']}    | ${['clubs:3', 'hearts:3', 'spades:3', 'diamonds:3', 'clubs:5']}     | ${'p2'}
    `('$description', ({ p1Cards, p2Cards, expectedWinner }) => {
      const result = runMatchup(p1Cards, p2Cards)
      expect(result.winnerId).toBe(expectedWinner)
    })
  })

  describe('Straight Flush vs Straight Flush', () => {
    it.each`
      description                                  | p1Cards                                                        | p2Cards                                                            | expectedWinner
      ${'Higher straight flush wins'}              | ${['clubs:9', 'clubs:10', 'clubs:11', 'clubs:12', 'clubs:13']} | ${['hearts:8', 'hearts:9', 'hearts:10', 'hearts:11', 'hearts:12']} | ${'p1'}
      ${'Same straight flush = tie'}               | ${['clubs:5', 'clubs:6', 'clubs:7', 'clubs:8', 'clubs:9']}     | ${['hearts:5', 'hearts:6', 'hearts:7', 'hearts:8', 'hearts:9']}    | ${'tie'}
      ${'10-high beats 9-high straight flush'}     | ${['clubs:6', 'clubs:7', 'clubs:8', 'clubs:9', 'clubs:10']}    | ${['hearts:5', 'hearts:6', 'hearts:7', 'hearts:8', 'hearts:9']}    | ${'p1'}
      ${'Wheel straight flush (A-5) loses to 2-6'} | ${['clubs:14', 'clubs:2', 'clubs:3', 'clubs:4', 'clubs:5']}    | ${['hearts:2', 'hearts:3', 'hearts:4', 'hearts:5', 'hearts:6']}    | ${'p2'}
      ${'Two wheel straight flushes = tie'}        | ${['clubs:14', 'clubs:2', 'clubs:3', 'clubs:4', 'clubs:5']}    | ${['hearts:14', 'hearts:2', 'hearts:3', 'hearts:4', 'hearts:5']}   | ${'tie'}
    `('$description', ({ p1Cards, p2Cards, expectedWinner }) => {
      const result = runMatchup(p1Cards, p2Cards)
      expect(result.winnerId).toBe(expectedWinner)
    })
  })

  describe('Cross-hand type comparisons', () => {
    it.each`
      description                              | p1Cards                                                          | p2Cards                                                              | expectedWinner | p1HandType              | p2HandType
      ${'Pair beats high card'}                | ${['clubs:2', 'hearts:2', 'spades:5', 'diamonds:8', 'clubs:11']} | ${['clubs:14', 'hearts:13', 'spades:12', 'diamonds:10', 'clubs:8']}  | ${'p1'}        | ${'pair'}               | ${'highCard'}
      ${'Two pair beats pair'}                 | ${['clubs:3', 'hearts:3', 'spades:4', 'diamonds:4', 'clubs:5']}  | ${['clubs:14', 'hearts:14', 'spades:13', 'diamonds:12', 'clubs:11']} | ${'p1'}        | ${'twoPair'}            | ${'pair'}
      ${'Three of a kind beats two pair'}      | ${['clubs:2', 'hearts:2', 'spades:2', 'diamonds:5', 'clubs:8']}  | ${['clubs:14', 'hearts:14', 'spades:13', 'diamonds:13', 'clubs:11']} | ${'p1'}        | ${'threeOfAKind'}       | ${'twoPair'}
      ${'Straight beats three of a kind'}      | ${['clubs:5', 'hearts:6', 'spades:7', 'diamonds:8', 'clubs:9']}  | ${['clubs:14', 'hearts:14', 'spades:14', 'diamonds:5', 'clubs:8']}   | ${'p1'}        | ${'straight'}           | ${'threeOfAKind'}
      ${'Flush beats straight'}                | ${['clubs:2', 'clubs:5', 'clubs:8', 'clubs:11', 'clubs:13']}     | ${['clubs:10', 'hearts:11', 'spades:12', 'diamonds:13', 'clubs:14']} | ${'p1'}        | ${'flush'}              | ${'straight'}
      ${'Full house beats flush'}              | ${['clubs:2', 'hearts:2', 'spades:2', 'diamonds:5', 'clubs:5']}  | ${['hearts:3', 'hearts:6', 'hearts:9', 'hearts:12', 'hearts:14']}    | ${'p1'}        | ${'fullHouse'}          | ${'flush'}
      ${'Four of a kind beats full house'}     | ${['clubs:2', 'hearts:2', 'spades:2', 'diamonds:2', 'clubs:5']}  | ${['clubs:14', 'hearts:14', 'spades:14', 'diamonds:13', 'clubs:13']} | ${'p1'}        | ${'fourOfAKind'}        | ${'fullHouse'}
      ${'Straight flush beats four of a kind'} | ${['clubs:5', 'clubs:6', 'clubs:7', 'clubs:8', 'clubs:9']}       | ${['clubs:14', 'hearts:14', 'spades:14', 'diamonds:14', 'clubs:5']}  | ${'p1'}        | ${'straightFlush'}      | ${'fourOfAKind'}
      ${'Royal flush beats straight flush'}    | ${['clubs:10', 'clubs:11', 'clubs:12', 'clubs:13', 'clubs:14']}  | ${['hearts:9', 'hearts:10', 'hearts:11', 'hearts:12', 'hearts:13']}  | ${'p1'}        | ${'royalStraightFlush'} | ${'straightFlush'}
    `('$description', ({ p1Cards, p2Cards, expectedWinner }) => {
      const result = runMatchup(p1Cards, p2Cards)
      expect(result.winnerId).toBe(expectedWinner)
    })
  })

  describe('High card vs high card', () => {
    it.each`
      description                          | p1Cards                                                             | p2Cards                                                              | expectedWinner
      ${'Ace high beats King high'}        | ${['clubs:14', 'hearts:12', 'spades:10', 'diamonds:8', 'clubs:6']}  | ${['clubs:13', 'hearts:12', 'spades:10', 'diamonds:8', 'clubs:6']}   | ${'p1'}
      ${'Same first, second card decides'} | ${['clubs:14', 'hearts:13', 'spades:10', 'diamonds:8', 'clubs:6']}  | ${['spades:14', 'hearts:12', 'diamonds:10', 'clubs:8', 'hearts:6']}  | ${'p1'}
      ${'Fifth card decides'}              | ${['clubs:14', 'hearts:13', 'spades:12', 'diamonds:11', 'clubs:9']} | ${['spades:14', 'diamonds:13', 'hearts:12', 'clubs:11', 'hearts:8']} | ${'p1'}
      ${'Same high cards = tie'}           | ${['clubs:14', 'hearts:13', 'spades:12', 'diamonds:11', 'clubs:9']} | ${['spades:14', 'diamonds:13', 'hearts:12', 'clubs:11', 'hearts:9']} | ${'tie'}
      ${'Low high card loses'}             | ${['clubs:9', 'hearts:7', 'spades:5', 'diamonds:4', 'clubs:2']}     | ${['clubs:14', 'hearts:5', 'spades:4', 'diamonds:3', 'clubs:2']}     | ${'p2'}
    `('$description', ({ p1Cards, p2Cards, expectedWinner }) => {
      const result = runMatchup(p1Cards, p2Cards)
      expect(result.winnerId).toBe(expectedWinner)
    })
  })

  describe('Edge cases and tricky scenarios', () => {
    it.each`
      description                                             | p1Cards                                                              | p2Cards                                                              | expectedWinner
      ${'Low pair with all high kickers loses to high pair'}  | ${['clubs:2', 'hearts:2', 'spades:14', 'diamonds:13', 'clubs:12']}   | ${['clubs:14', 'hearts:14', 'spades:3', 'diamonds:4', 'clubs:5']}    | ${'p2'}
      ${'Pair of Aces beats pair of Kings with Ace kicker'}   | ${['clubs:14', 'hearts:14', 'spades:3', 'diamonds:4', 'clubs:5']}    | ${['clubs:13', 'hearts:13', 'spades:14', 'diamonds:12', 'clubs:11']} | ${'p1'}
      ${'Two pair with low pairs beats single high pair'}     | ${['clubs:3', 'hearts:3', 'spades:2', 'diamonds:2', 'clubs:5']}      | ${['clubs:14', 'hearts:14', 'spades:13', 'diamonds:12', 'clubs:11']} | ${'p1'}
      ${'222+33 full house loses to KKK+22 full house'}       | ${['clubs:2', 'hearts:2', 'spades:2', 'diamonds:3', 'clubs:3']}      | ${['clubs:13', 'hearts:13', 'spades:13', 'diamonds:2', 'hearts:2']}  | ${'p2'}
      ${'Broadway straight (10-A) beats middle straight'}     | ${['clubs:10', 'hearts:11', 'spades:12', 'diamonds:13', 'clubs:14']} | ${['clubs:8', 'hearts:9', 'spades:10', 'diamonds:11', 'clubs:12']}   | ${'p1'}
      ${'999+AA full house beats 888+KK full house'}          | ${['clubs:9', 'hearts:9', 'spades:9', 'diamonds:14', 'clubs:14']}    | ${['clubs:8', 'hearts:8', 'spades:8', 'diamonds:13', 'hearts:13']}   | ${'p1'}
      ${'Wheel straight (A-5) loses to any regular straight'} | ${['clubs:14', 'hearts:2', 'spades:3', 'diamonds:4', 'clubs:5']}     | ${['clubs:6', 'hearts:7', 'spades:8', 'diamonds:9', 'clubs:10']}     | ${'p2'}
    `('$description', ({ p1Cards, p2Cards, expectedWinner }) => {
      const result = runMatchup(p1Cards, p2Cards)
      expect(result.winnerId).toBe(expectedWinner)
    })
  })
})
