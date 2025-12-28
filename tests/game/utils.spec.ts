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

  describe('No hand (high card only)', () => {
    it('returns null handType and 0 points for high card only', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:5', 'spades:8', 'diamonds:10', 'clubs:13')
      )
      expect(result).toEqual({ handType: null, points: 0 })
    })

    it('returns 0 points for non-consecutive, non-matching cards', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:3', 'hearts:6', 'spades:9', 'diamonds:12', 'clubs:14')
      )
      expect(result).toEqual({ handType: null, points: 0 })
    })
  })

  describe('Pair', () => {
    it('detects a pair of 2s', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:2', 'spades:5', 'diamonds:8', 'clubs:11')
      )
      expect(result).toEqual({ handType: 'pair', points: 1 })
    })

    it('detects a pair of Aces', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'hearts:14', 'spades:5', 'diamonds:8', 'clubs:11')
      )
      expect(result).toEqual({ handType: 'pair', points: 1 })
    })

    it('detects a pair in the middle of the hand', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:3', 'hearts:7', 'spades:7', 'diamonds:10', 'clubs:13')
      )
      expect(result).toEqual({ handType: 'pair', points: 1 })
    })
  })

  describe('Two Pair', () => {
    it('detects two pairs', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:4', 'hearts:4', 'spades:9', 'diamonds:9', 'clubs:12')
      )
      expect(result).toEqual({ handType: 'twoPair', points: 2 })
    })

    it('detects two pairs with high and low values', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:2', 'spades:14', 'diamonds:14', 'clubs:7')
      )
      expect(result).toEqual({ handType: 'twoPair', points: 2 })
    })

    it('detects two pairs regardless of order', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:5', 'hearts:8', 'spades:5', 'diamonds:8', 'clubs:11')
      )
      expect(result).toEqual({ handType: 'twoPair', points: 2 })
    })
  })

  describe('Three of a Kind', () => {
    it('detects three of a kind', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:6', 'hearts:6', 'spades:6', 'diamonds:10', 'clubs:13')
      )
      expect(result).toEqual({ handType: 'threeOfAKind', points: 3 })
    })

    it('detects three Aces', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'hearts:14', 'spades:14', 'diamonds:5', 'clubs:8')
      )
      expect(result).toEqual({ handType: 'threeOfAKind', points: 3 })
    })

    it('detects three 2s', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:2', 'spades:2', 'diamonds:9', 'clubs:12')
      )
      expect(result).toEqual({ handType: 'threeOfAKind', points: 3 })
    })
  })

  describe('Straight', () => {
    it('detects a straight (5-6-7-8-9)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:5', 'hearts:6', 'spades:7', 'diamonds:8', 'clubs:9')
      )
      expect(result).toEqual({ handType: 'straight', points: 4 })
    })

    it('detects a low straight (A-2-3-4-5)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'hearts:2', 'spades:3', 'diamonds:4', 'clubs:5')
      )
      expect(result).toEqual({ handType: 'straight', points: 4 })
    })

    it('detects a high straight (10-J-Q-K-A)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:10', 'hearts:11', 'spades:12', 'diamonds:13', 'clubs:14')
      )
      expect(result).toEqual({ handType: 'straight', points: 4 })
    })

    it('detects a straight regardless of suit order', () => {
      const result = getPointsForHand(
        game,
        hand('hearts:9', 'clubs:8', 'diamonds:7', 'spades:6', 'hearts:5')
      )
      expect(result).toEqual({ handType: 'straight', points: 4 })
    })
  })

  describe('Flush', () => {
    it('detects a flush (all clubs)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'clubs:5', 'clubs:8', 'clubs:11', 'clubs:13')
      )
      expect(result).toEqual({ handType: 'flush', points: 5 })
    })

    it('detects a flush (all hearts)', () => {
      const result = getPointsForHand(
        game,
        hand('hearts:3', 'hearts:6', 'hearts:9', 'hearts:12', 'hearts:14')
      )
      expect(result).toEqual({ handType: 'flush', points: 5 })
    })

    it('detects a flush (all spades)', () => {
      const result = getPointsForHand(
        game,
        hand('spades:2', 'spades:4', 'spades:7', 'spades:10', 'spades:13')
      )
      expect(result).toEqual({ handType: 'flush', points: 5 })
    })

    it('detects a flush (all diamonds)', () => {
      const result = getPointsForHand(
        game,
        hand('diamonds:3', 'diamonds:5', 'diamonds:8', 'diamonds:11', 'diamonds:14')
      )
      expect(result).toEqual({ handType: 'flush', points: 5 })
    })
  })

  describe('Full House', () => {
    it('detects a full house (three 8s and two Jacks)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:8', 'hearts:8', 'spades:8', 'diamonds:11', 'clubs:11')
      )
      expect(result).toEqual({ handType: 'fullHouse', points: 6 })
    })

    it('detects a full house (three Aces and two 2s)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'hearts:14', 'spades:14', 'diamonds:2', 'clubs:2')
      )
      expect(result).toEqual({ handType: 'fullHouse', points: 6 })
    })

    it('detects a full house (three 2s and two Kings)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:2', 'spades:2', 'diamonds:13', 'clubs:13')
      )
      expect(result).toEqual({ handType: 'fullHouse', points: 6 })
    })

    it('detects a full house regardless of card order', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:7', 'hearts:10', 'spades:7', 'diamonds:10', 'clubs:10')
      )
      expect(result).toEqual({ handType: 'fullHouse', points: 6 })
    })

    it('correctly identifies full house over three of a kind', () => {
      // This was the bug: full house was being detected as three of a kind
      const result = getPointsForHand(
        game,
        hand('clubs:8', 'hearts:11', 'spades:8', 'diamonds:11', 'hearts:8')
      )
      expect(result).toEqual({ handType: 'fullHouse', points: 6 })
    })
  })

  describe('Four of a Kind', () => {
    it('detects four of a kind', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:9', 'hearts:9', 'spades:9', 'diamonds:9', 'clubs:5')
      )
      expect(result).toEqual({ handType: 'fourOfAKind', points: 7 })
    })

    it('detects four Aces', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'hearts:14', 'spades:14', 'diamonds:14', 'clubs:7')
      )
      expect(result).toEqual({ handType: 'fourOfAKind', points: 7 })
    })

    it('detects four 2s', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:2', 'hearts:2', 'spades:2', 'diamonds:2', 'clubs:10')
      )
      expect(result).toEqual({ handType: 'fourOfAKind', points: 7 })
    })
  })

  describe('Straight Flush', () => {
    it('detects a straight flush', () => {
      const result = getPointsForHand(
        game,
        hand('hearts:5', 'hearts:6', 'hearts:7', 'hearts:8', 'hearts:9')
      )
      expect(result).toEqual({ handType: 'straightFlush', points: 8 })
    })

    it('detects a low straight flush (A-2-3-4-5 same suit)', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:14', 'clubs:2', 'clubs:3', 'clubs:4', 'clubs:5')
      )
      expect(result).toEqual({ handType: 'straightFlush', points: 8 })
    })

    it('detects straight flush in different suits', () => {
      const result = getPointsForHand(
        game,
        hand('spades:6', 'spades:7', 'spades:8', 'spades:9', 'spades:10')
      )
      expect(result).toEqual({ handType: 'straightFlush', points: 8 })
    })
  })

  describe('Royal Straight Flush', () => {
    it('detects a royal straight flush (10-J-Q-K-A same suit)', () => {
      const result = getPointsForHand(
        game,
        hand('hearts:10', 'hearts:11', 'hearts:12', 'hearts:13', 'hearts:14')
      )
      expect(result).toEqual({ handType: 'royalStraightFlush', points: 52 })
    })

    it('detects royal flush in clubs', () => {
      const result = getPointsForHand(
        game,
        hand('clubs:10', 'clubs:11', 'clubs:12', 'clubs:13', 'clubs:14')
      )
      expect(result).toEqual({ handType: 'royalStraightFlush', points: 52 })
    })

    it('detects royal flush in spades', () => {
      const result = getPointsForHand(
        game,
        hand('spades:10', 'spades:11', 'spades:12', 'spades:13', 'spades:14')
      )
      expect(result).toEqual({ handType: 'royalStraightFlush', points: 52 })
    })

    it('detects royal flush in diamonds', () => {
      const result = getPointsForHand(
        game,
        hand('diamonds:10', 'diamonds:11', 'diamonds:12', 'diamonds:13', 'diamonds:14')
      )
      expect(result).toEqual({ handType: 'royalStraightFlush', points: 52 })
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
})

describe('tieBreak', () => {
  it('returns single candidate when no tie', () => {
    const player = stubPlayer({ id: 'p1' })
    setCards(player, 'clubs:14', 'hearts:13', 'spades:12', 'diamonds:11', 'clubs:9')

    const candidates = [{ player, handType: 'pair' as const, points: 1 }]
    const result = tieBreak(candidates)

    expect(result).toHaveLength(1)
  })

  it('breaks tie by highest card', () => {
    const p1 = stubPlayer({ id: 'p1' })
    const p2 = stubPlayer({ id: 'p2' })

    // P1 has Ace high
    setCards(p1, 'clubs:14', 'hearts:5', 'spades:6', 'diamonds:7', 'clubs:8')
    // P2 has King high
    setCards(p2, 'clubs:13', 'hearts:5', 'spades:6', 'diamonds:7', 'clubs:8')

    const candidates = [
      { player: p1, handType: 'pair' as const, points: 1 },
      { player: p2, handType: 'pair' as const, points: 1 },
    ]
    const result = tieBreak(candidates)

    expect(result).toHaveLength(1)
    expect(result[0].player.id).toBe('p1')
  })

  it('uses second highest card when first is tied', () => {
    const p1 = stubPlayer({ id: 'p1' })
    const p2 = stubPlayer({ id: 'p2' })

    // Both have Ace, but P1 has King as second
    setCards(p1, 'clubs:14', 'hearts:13', 'spades:6', 'diamonds:7', 'clubs:8')
    // P2 has Queen as second
    setCards(p2, 'spades:14', 'hearts:12', 'diamonds:6', 'clubs:7', 'hearts:8')

    const candidates = [
      { player: p1, handType: 'pair' as const, points: 1 },
      { player: p2, handType: 'pair' as const, points: 1 },
    ]
    const result = tieBreak(candidates)

    expect(result).toHaveLength(1)
    expect(result[0].player.id).toBe('p1')
  })

  it('returns all candidates when completely tied', () => {
    const p1 = stubPlayer({ id: 'p1' })
    const p2 = stubPlayer({ id: 'p2' })

    // Identical values (different suits)
    setCards(p1, 'clubs:14', 'hearts:13', 'spades:12', 'diamonds:11', 'clubs:10')
    setCards(p2, 'spades:14', 'diamonds:13', 'hearts:12', 'clubs:11', 'hearts:10')

    const candidates = [
      { player: p1, handType: 'pair' as const, points: 1 },
      { player: p2, handType: 'pair' as const, points: 1 },
    ]
    const result = tieBreak(candidates)

    expect(result).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    const result = tieBreak([])
    expect(result).toHaveLength(0)
  })
})

