/**
 * Card fixtures utilities for Chicago game tests.
 * Each player receives exactly 5 cards.
 */

import { CARDS_BY_ID } from 'game/constants'
import { Card, Game } from 'game/types'

// Helper to get card by ID with type safety
export const card = (id: keyof typeof CARDS_BY_ID) => CARDS_BY_ID[id]

export type HandFixture = {
  player1: Card[]
  player2: Card[]
  player3: Card[]
  player4: Card[]
}

/**
 * Apply a hand fixture to a game's players (supports 2-4 players)
 */
export const applyHandFixture = (game: Game, fixture: HandFixture) => {
  const players = game.players
  const hands = [fixture.player1, fixture.player2, fixture.player3, fixture.player4]

  // Clear existing cards and deal to each player
  players.forEach((player, i) => {
    player.cards.clear()
    if (hands[i]) {
      hands[i].forEach((c) => player.cards.add(c))
    }
  })

  // Set up remaining deck (cards not dealt)
  const usedIds = new Set(
    hands
      .slice(0, players.length)
      .flat()
      .map((c) => c.id)
  )
  game.deck = Object.values(CARDS_BY_ID).filter((c) => !usedIds.has(c.id))
}

/**
 * Create a mock dealCards function that applies a fixture
 * Returns the remaining deck (cards not dealt) just like the real dealCards
 */
export const createMockDealCards = (fixture: HandFixture) => {
  return (game: Game) => {
    applyHandFixture(game, fixture)
    // Return the remaining deck (game.deck was set by applyHandFixture)
    return game.deck
  }
}

/**
 * Default hands for tests that don't care about specific card values.
 * Each player gets 5 arbitrary cards.
 */
export const defaultHands: HandFixture = {
  player1: [
    card('clubs:2'),
    card('hearts:3'),
    card('spades:4'),
    card('diamonds:5'),
    card('clubs:6'),
  ],
  player2: [
    card('clubs:7'),
    card('hearts:8'),
    card('spades:9'),
    card('diamonds:10'),
    card('clubs:11'),
  ],
  player3: [
    card('hearts:2'),
    card('spades:3'),
    card('diamonds:4'),
    card('clubs:5'),
    card('hearts:6'),
  ],
  player4: [
    card('spades:7'),
    card('diamonds:8'),
    card('clubs:9'),
    card('hearts:10'),
    card('spades:11'),
  ],
}
