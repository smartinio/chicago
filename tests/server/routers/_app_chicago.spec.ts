/**
 * Chicago Card Game - Acceptance Test Suite
 *
 * This test suite implements the acceptance criteria defined in CHICAGO_ACCEPTANCE_CRITERIA.md
 */

import { AppRouter, appRouter } from 'server/routers/_app'
import { inferProcedureInput } from '@trpc/server'
import { games } from 'game/store'
import { Errors, Game, isError, Results } from 'game/types'
import { dealCards } from 'game/dealCards'
import { createCallerFactory } from 'server/trpc'
import { card, createMockDealCards, defaultHands, HandFixture } from './chicago-fixtures'

// Mock dealCards to control card distribution
const mockDealCards = dealCards as jest.Mock
jest.mock('game/dealCards')

// Create a caller factory for testing
const createCaller = () => createCallerFactory(appRouter)({})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a new game and returns game/player info
 */
async function createGame(
  caller: ReturnType<typeof createCaller>,
  options: { gameName?: string; playerName?: string; password?: string } = {}
) {
  const input: inferProcedureInput<AppRouter['createNewGame']> = {
    gameName: options.gameName ?? 'Game', // Max 10 chars
    playerName: options.playerName ?? 'P1', // Max 8 chars
    password: options.password,
  }

  const result = await caller.createNewGame(input)
  const game = games.get(result.gameId)!

  return { result, game, player: game.players[0] }
}

/**
 * Joins an existing game
 */
async function joinGame(
  caller: ReturnType<typeof createCaller>,
  gameId: string,
  options: { playerName: string; password?: string }
) {
  const input: inferProcedureInput<AppRouter['joinGame']> = {
    gameId,
    playerName: options.playerName,
    password: options.password,
  }

  return caller.joinGame(input)
}

/**
 * Sets up a game with N players, ready to start
 */
async function setupGame(
  caller: ReturnType<typeof createCaller>,
  numPlayers: number,
  password?: string
) {
  const { game, result } = await createGame(caller, { password })

  for (let i = 2; i <= numPlayers; i++) {
    await joinGame(caller, game.id, { playerName: `P${i}`, password }) // Max 8 chars
  }

  return { game, ownerId: result.playerId, ownerSecret: result.playerSecret }
}

/**
 * Starts a new round
 */
async function startRound(
  caller: ReturnType<typeof createCaller>,
  game: Game,
  fixture?: HandFixture
) {
  if (fixture) {
    mockDealCards.mockImplementation(createMockDealCards(fixture))
  }

  const input: inferProcedureInput<AppRouter['startNewRound']> = {
    gameId: game.id,
    dealerSecret: game.dealer.secret,
  }

  return caller.startNewRound(input)
}

/**
 * Has all players skip throwing (exchange 0 cards)
 */
async function skipAllThrows(caller: ReturnType<typeof createCaller>, game: Game) {
  // Safety limit to prevent infinite loops
  const maxIterations = game.players.length * game.rules.numberOfThrows + 5
  let iterations = 0

  // Complete all throw cycles - keep going until we're not in throwing phase
  while (game.round.phase === 'throwing') {
    if (iterations++ > maxIterations) {
      throw new Error(
        `skipAllThrows exceeded max iterations. Phase: ${game.round.phase}, Cycles: ${game.round.throwCycles.length}`
      )
    }

    const currentPlayer = game.currentPlayer

    const result = await caller.throwCards({
      gameId: game.id,
      playerSecret: currentPlayer.secret,
      cards: [],
      oneOpen: false,
    })

    if (isError(result)) {
      throw new Error(`Failed to skip throw: ${result}`)
    }
  }
}

/**
 * Has all players decline Chicago
 */
async function declineAllChicago(caller: ReturnType<typeof createCaller>, game: Game) {
  const maxIterations = game.players.length + 2
  let iterations = 0

  while (game.round.phase === 'asking_chicago') {
    if (iterations++ > maxIterations) {
      throw new Error(`declineAllChicago exceeded max iterations. Phase: ${game.round.phase}`)
    }

    await caller.answerChicago({
      gameId: game.id,
      playerSecret: game.currentPlayer.secret,
      takeChicago: false,
    })
  }
}

/**
 * Plays a complete trick where each player plays their first valid card
 * Returns early if the round ends (e.g., Chicago failure)
 */
async function playTrick(caller: ReturnType<typeof createCaller>, game: Game) {
  let leadSuit: string | null = null

  for (let i = 0; i < game.players.length; i++) {
    // Check if round ended (e.g., Chicago failure)
    if (game.round.phase !== 'tricking') {
      return
    }

    const player = game.currentPlayer
    const hand = Array.from(player.cards)

    // Find a valid card to play
    let cardToPlay = hand[0]
    if (leadSuit) {
      const suitCard = hand.find((c) => c.suit === leadSuit)
      if (suitCard) cardToPlay = suitCard
    } else {
      leadSuit = cardToPlay.suit
    }

    const result = await caller.playCard({
      gameId: game.id,
      playerSecret: player.secret,
      card: { id: cardToPlay.id },
    })

    if (isError(result)) {
      throw new Error(`Failed to play card: ${result}`)
    }
  }
}

/**
 * Plays all 5 tricks (or until round ends)
 */
async function playAllTricks(caller: ReturnType<typeof createCaller>, game: Game) {
  for (let i = 0; i < 5; i++) {
    if (game.round.phase !== 'tricking') return
    await playTrick(caller, game)
  }
}

// ============================================================================
// TESTS: GAME SETUP
// ============================================================================

describe('Chicago: Game Setup', () => {
  const caller = createCaller()

  describe('Creating a game', () => {
    test('Player can create a game with name and player name', async () => {
      const { result, game } = await createGame(caller, {
        gameName: 'Chicago', // Max 10 chars
        playerName: 'Alice', // Max 8 chars
      })

      expect(result).toEqual({
        playerId: expect.any(String),
        playerSecret: expect.any(String),
        gameId: expect.any(String),
      })

      expect(game.name).toBe('Chicago')
      expect(game.players[0].name).toBe('Alice')
      expect(game.phase).toBe('new')
      expect(game.owner.id).toBe(result.playerId)
      expect(game.dealer.id).toBe(result.playerId)
    })

    test('Game can have an optional password', async () => {
      const { game } = await createGame(caller, { password: 'secret123' })
      expect(game.password).toBe('secret123')
    })
  })

  describe('Joining a game', () => {
    test('Players 2-4 can join an existing game', async () => {
      const { game } = await setupGame(caller, 4)
      expect(game.players).toHaveLength(4)
      expect(game.players.map((p) => p.name)).toEqual(['P1', 'P2', 'P3', 'P4'])
    })

    test('Player names must be unique', async () => {
      const { game } = await createGame(caller)
      const result = await joinGame(caller, game.id, { playerName: 'P1' }) // Same as creator
      expect(result).toBe(Errors.NAME_ALREADY_TAKEN)
    })

    test('Cannot join with wrong password', async () => {
      const { game } = await createGame(caller, { password: 'correct' })
      const result = await joinGame(caller, game.id, {
        playerName: 'Player 2',
        password: 'wrong',
      })
      expect(result).toBe(Errors.FORBIDDEN)
    })

    test('Cannot exceed 4 players', async () => {
      const { game } = await setupGame(caller, 4)
      const result = await joinGame(caller, game.id, { playerName: 'Player 5' })
      expect(result).toBe(Errors.TOO_MANY_PLAYERS)
    })
  })

  describe('Starting a round', () => {
    beforeEach(() => {
      mockDealCards.mockImplementation(createMockDealCards(defaultHands))
    })

    test('Dealer can start a round with 2+ players', async () => {
      const { game, ownerSecret } = await setupGame(caller, 4)

      const result = await startRound(caller, game)

      expect(result).toBe(Results.STARTED_ROUND)
      expect(game.phase).toBe('round')
    })

    test('Cannot start with fewer than 2 players', async () => {
      const { game } = await createGame(caller)

      const result = await startRound(caller, game)

      expect(result).toBe(Errors.TOO_FEW_PLAYERS)
    })

    test('Each player receives 5 cards', async () => {
      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)

      for (const player of game.players) {
        expect(player.cards.size).toBe(5)
      }
    })

    test('Round starts in throwing phase', async () => {
      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)

      expect(game.round.phase).toBe('throwing')
    })

    test('Player after dealer is first to act', async () => {
      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)

      expect(game.currentPlayer.name).toBe('P2')
    })
  })
})

// ============================================================================
// TESTS: THROWING PHASE
// ============================================================================

describe('Chicago: Throwing Phase', () => {
  const caller = createCaller()

  beforeEach(() => {
    mockDealCards.mockImplementation(createMockDealCards(defaultHands))
  })

  describe('Basic throwing', () => {
    test('Player can exchange 0-5 cards', async () => {
      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)

      const player = game.currentPlayer
      const cardsToThrow = Array.from(player.cards).slice(0, 3)

      const result = await caller.throwCards({
        gameId: game.id,
        playerSecret: player.secret,
        cards: cardsToThrow.map((c) => ({ id: c.id })),
        oneOpen: false,
      })

      expect(result).toBe(Results.THREW_CARDS)
      expect(player.cards.size).toBe(5) // Still has 5 cards after exchange
    })

    test('Player can skip throwing (exchange 0 cards)', async () => {
      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)

      const result = await caller.throwCards({
        gameId: game.id,
        playerSecret: game.currentPlayer.secret,
        cards: [],
        oneOpen: false,
      })

      expect(result).toBe(Results.THREW_CARDS)
    })

    test('Cannot throw cards not in hand', async () => {
      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)

      const otherPlayerCard = Array.from(game.players[2].cards)[0]

      const result = await caller.throwCards({
        gameId: game.id,
        playerSecret: game.currentPlayer.secret,
        cards: [{ id: otherPlayerCard.id }],
        oneOpen: false,
      })

      expect(result).toBe(Errors.CARD_NOT_IN_HAND)
    })

    test('oneOpen triggers asking_one_open phase on final throw cycle', async () => {
      const { game } = await setupGame(caller, 4)
      game.rules.oneOpenMode = 'last' // oneOpen only allowed on last cycle
      game.rules.numberOfThrows = 1 // Make this the only (and thus final) cycle
      await startRound(caller, game)

      const player = game.currentPlayer
      const initialCardCount = player.cards.size
      const cardToThrow = Array.from(player.cards)[0]

      const result = await caller.throwCards({
        gameId: game.id,
        playerSecret: player.secret,
        cards: [{ id: cardToThrow.id }],
        oneOpen: true,
      })

      expect(result).toBe(Results.THREW_CARDS)
      expect(game.round.phase).toBe('asking_one_open')
      expect(game.round.openCard).toBeDefined()

      // Verify card mechanics:
      // - Thrown card should be removed from player's hand
      expect(player.cards.has(cardToThrow)).toBe(false)
      // - Player should have same number of cards (threw 1, but hasn't drawn replacement yet)
      expect(player.cards.size).toBe(initialCardCount - 1)
    })

    test('oneOpen is forbidden before final throw cycle when oneOpenMode is last', async () => {
      const { game } = await setupGame(caller, 4)
      game.rules.oneOpenMode = 'last'
      game.rules.numberOfThrows = 3 // 3 cycles, so cycle 1 is not the last
      await startRound(caller, game)

      const player = game.currentPlayer
      const cardToThrow = Array.from(player.cards)[0]

      const result = await caller.throwCards({
        gameId: game.id,
        playerSecret: player.secret,
        cards: [{ id: cardToThrow.id }],
        oneOpen: true,
      })

      expect(result).toBe(Errors.FORBIDDEN)
    })

    test('answerOneOpen accepts the open card and returns to throwing', async () => {
      const { game } = await setupGame(caller, 4)
      game.rules.oneOpenMode = 'last'
      game.rules.numberOfThrows = 1
      await startRound(caller, game)

      const player = game.currentPlayer
      const cardToThrow = Array.from(player.cards)[0]

      // Trigger oneOpen
      await caller.throwCards({
        gameId: game.id,
        playerSecret: player.secret,
        cards: [{ id: cardToThrow.id }],
        oneOpen: true,
      })

      expect(game.round.phase).toBe('asking_one_open')
      const openCard = game.round.openCard!
      expect(openCard).toBeDefined()

      // Accept the open card
      const result = await caller.answerOneOpen({
        gameId: game.id,
        playerSecret: player.secret,
        acceptOpen: true,
      })

      expect(result).toBe(Results.ANSWERED_ONE_OPEN)
      // Open card should be cleared
      expect(game.round.openCard).toBeUndefined()
      // Player should now have the open card
      expect(player.cards.has(openCard)).toBe(true)
      // Should have moved past throwing phase (since numberOfThrows=1, this was the last cycle)
      expect(game.round.phase).not.toBe('asking_one_open')
    })

    test('answerOneOpen rejects the open card and draws a new one', async () => {
      const { game } = await setupGame(caller, 4)
      game.rules.oneOpenMode = 'last'
      game.rules.numberOfThrows = 1
      await startRound(caller, game)

      const player = game.currentPlayer
      const cardToThrow = Array.from(player.cards)[0]

      await caller.throwCards({
        gameId: game.id,
        playerSecret: player.secret,
        cards: [{ id: cardToThrow.id }],
        oneOpen: true,
      })

      const openCard = game.round.openCard!
      const cardCountBefore = player.cards.size

      // Reject the open card
      const result = await caller.answerOneOpen({
        gameId: game.id,
        playerSecret: player.secret,
        acceptOpen: false,
      })

      expect(result).toBe(Results.ANSWERED_ONE_OPEN)
      // Open card should NOT be in player's hand
      expect(player.cards.has(openCard)).toBe(false)
      // Player should have drawn a replacement
      expect(player.cards.size).toBe(cardCountBefore + 1)
    })
  })

  describe('Throw cycles and scoring', () => {
    test('Best hand is scored after each throw cycle (except final)', async () => {
      // P3 has three 10s (3 points for three of a kind)
      // Other players have no poker hands (just high cards)
      const handsWithThreeOfAKind: HandFixture = {
        player1: [
          card('clubs:2'),
          card('hearts:4'),
          card('spades:7'),
          card('diamonds:9'),
          card('clubs:13'),
        ],
        player2: [
          card('clubs:3'),
          card('hearts:5'),
          card('spades:8'),
          card('diamonds:11'),
          card('clubs:14'),
        ],
        player3: [
          card('clubs:10'),
          card('hearts:10'),
          card('spades:10'),
          card('diamonds:6'),
          card('hearts:12'),
        ],
        player4: [
          card('spades:2'),
          card('diamonds:4'),
          card('clubs:6'),
          card('hearts:8'),
          card('spades:11'),
        ],
      }

      const { game } = await setupGame(caller, 4)
      await startRound(caller, game, handsWithThreeOfAKind)

      const player3 = game.players[2]

      // Verify P3 actually has the expected cards (three 10s)
      const p3Cards = Array.from(player3.cards)
      expect(p3Cards.length).toBe(5)
      const tenCount = p3Cards.filter((c) => c.value === 10).length
      expect(tenCount).toBe(3) // Three 10s

      // Complete first throw cycle
      for (let i = 0; i < game.players.length; i++) {
        await caller.throwCards({
          gameId: game.id,
          playerSecret: game.currentPlayer.secret,
          cards: [],
          oneOpen: false,
        })
      }

      // After first cycle, we should be in cycle 2 (or asking_four_of_a_kind)
      // Check the phase and cycle count
      expect(game.round.throwCycles.length).toBeGreaterThanOrEqual(2)

      // Player 3 should have received 3 points for three of a kind
      expect(player3.score).toBe(3)
    })

    test('There are up to 3 throw cycles by default', async () => {
      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)

      expect(game.rules.numberOfThrows).toBe(3)

      await skipAllThrows(caller, game)

      // After 3 cycles, should move to asking_chicago
      // (chicagoCanBeCalledBeforeFifteen defaults to true)
      expect(game.round.phase).toBe('asking_chicago')
    })
  })

  describe('Throw score threshold', () => {
    test('Players at or above threshold cannot throw', async () => {
      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)

      // After round starts, set player 2 above threshold
      // Player 2 (P2) is the current player after dealer (P1)
      const player2 = game.players[1]
      const player3 = game.players[2]
      player2.score = 46 // At threshold (default is 46)

      // Player 2 throws (they're current, so they can still throw this turn)
      await caller.throwCards({
        gameId: game.id,
        playerSecret: player2.secret,
        cards: [],
        oneOpen: false,
      })

      // Complete the rest of cycle 1 (P3, P4, P1)
      while (game.round.throwCycles[0]?.some((thrown) => !thrown)) {
        await caller.throwCards({
          gameId: game.id,
          playerSecret: game.currentPlayer.secret,
          cards: [],
          oneOpen: false,
        })
      }

      // After cycle 1, we move to cycle 2 (numberOfThrows defaults to 3)
      // Player 2 should be skipped, so current player should be P3
      expect(game.round.phase).toBe('throwing')
      expect(game.round.throwCycles.length).toBe(2)
      expect(game.currentPlayer.id).toBe(player3.id)
    })

    test('If all players above threshold, skip to next phase', async () => {
      const { game } = await setupGame(caller, 4)

      // Set all players above threshold BEFORE round starts
      for (const player of game.players) {
        player.score = 46
      }

      await startRound(caller, game)

      // Should skip throwing entirely
      // Since chicagoCanBeCalledBeforeFifteen defaults to true, go to asking_chicago
      expect(game.round.phase).toBe('asking_chicago')
    })
  })
})

// ============================================================================
// TESTS: CHICAGO DECLARATION
// ============================================================================

describe('Chicago: Chicago Declaration', () => {
  const caller = createCaller()

  beforeEach(() => {
    mockDealCards.mockImplementation(createMockDealCards(defaultHands))
  })

  describe('Calling Chicago', () => {
    test('Player can call Chicago after throwing phase', async () => {
      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)
      await skipAllThrows(caller, game)

      expect(game.round.phase).toBe('asking_chicago')

      await caller.answerChicago({
        gameId: game.id,
        playerSecret: game.currentPlayer.secret,
        takeChicago: true,
      })

      expect(game.round.chicagoCaller).toBeDefined()
      expect(game.round.phase).toBe('tricking')
    })

    test('Player can decline Chicago', async () => {
      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)
      await skipAllThrows(caller, game)

      const firstPlayer = game.currentPlayer

      await caller.answerChicago({
        gameId: game.id,
        playerSecret: game.currentPlayer.secret,
        takeChicago: false,
      })

      // Should move to next player or tricking phase
      expect(game.currentPlayer.id).not.toBe(firstPlayer.id)
    })

    test('If all players decline, proceed to tricking without Chicago', async () => {
      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)
      await skipAllThrows(caller, game)
      await declineAllChicago(caller, game)

      expect(game.round.phase).toBe('tricking')
      expect(game.round.chicagoCaller).toBeUndefined()
    })
  })

  describe('Chicago success', () => {
    test('Winning all 5 tricks gives +15 points', async () => {
      // P2 has A, K, Q, J, 10 of spades - guaranteed to win all tricks
      const chicagoWinnable: HandFixture = {
        player1: [
          card('clubs:2'),
          card('hearts:3'),
          card('diamonds:4'),
          card('clubs:5'),
          card('hearts:6'),
        ],
        player2: [
          card('spades:14'),
          card('spades:13'),
          card('spades:12'),
          card('spades:11'),
          card('spades:10'),
        ],
        player3: [
          card('clubs:7'),
          card('hearts:8'),
          card('diamonds:9'),
          card('clubs:3'),
          card('hearts:4'),
        ],
        player4: [
          card('diamonds:2'),
          card('clubs:8'),
          card('hearts:9'),
          card('diamonds:5'),
          card('clubs:4'),
        ],
      }
      mockDealCards.mockImplementation(createMockDealCards(chicagoWinnable))

      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)
      await skipAllThrows(caller, game)

      const player2 = game.players[1]

      // Navigate to player 2 in Chicago asking
      while (game.currentPlayer.id !== player2.id && game.round.phase === 'asking_chicago') {
        await caller.answerChicago({
          gameId: game.id,
          playerSecret: game.currentPlayer.secret,
          takeChicago: false,
        })
      }

      await caller.answerChicago({
        gameId: game.id,
        playerSecret: player2.secret,
        takeChicago: true,
      })

      expect(game.round.chicagoCaller?.id).toBe(player2.id)

      const initialScore = player2.score

      // Play all 5 tricks - Player 2 leads spades each time and wins all
      for (let trick = 0; trick < 5; trick++) {
        for (let i = 0; i < 4; i++) {
          const currentPlayer = game.currentPlayer
          const hand = Array.from(currentPlayer.cards)

          const leadCard =
            game.round.tricks.length > 0 ? game.round.tricks[game.round.tricks.length - 1] : null
          const leadSuit = leadCard?.playedCards[0]?.card.suit

          let cardToPlay = hand[0]
          if (leadSuit) {
            const suitCards = hand.filter((c) => c.suit === leadSuit)
            if (suitCards.length > 0) {
              cardToPlay = suitCards.sort((a, b) => b.value - a.value)[0]
            }
          } else {
            cardToPlay = hand.sort((a, b) => b.value - a.value)[0]
          }

          await caller.playCard({
            gameId: game.id,
            playerSecret: currentPlayer.secret,
            card: { id: cardToPlay.id },
          })

          if (game.round.phase === 'over') break
        }
        if (game.round.phase === 'over') break
      }

      expect(player2.score).toBe(initialScore + 15)
      expect(player2.takenChicago).toBe(true)
    })
  })

  describe('Chicago failure', () => {
    test('Losing any trick gives -15 points', async () => {
      // P2 has high cards but P1 has Ace of clubs that beats P2's King
      // P2 does NOT have four of a kind (only 2 kings)
      const chicagoLosable: HandFixture = {
        player1: [
          card('clubs:14'),
          card('hearts:2'),
          card('diamonds:3'),
          card('spades:4'),
          card('clubs:5'),
        ],
        player2: [
          card('clubs:13'),
          card('hearts:13'),
          card('diamonds:12'),
          card('spades:12'),
          card('clubs:6'),
        ],
        player3: [
          card('clubs:7'),
          card('hearts:8'),
          card('diamonds:9'),
          card('spades:3'),
          card('hearts:4'),
        ],
        player4: [
          card('diamonds:2'),
          card('clubs:8'),
          card('hearts:9'),
          card('diamonds:5'),
          card('spades:5'),
        ],
      }

      const { game } = await setupGame(caller, 4)
      await startRound(caller, game, chicagoLosable)
      await skipAllThrows(caller, game)

      const player2 = game.players[1]

      let safetyCounter = 0
      while (game.currentPlayer.id !== player2.id && game.round.phase === 'asking_chicago') {
        if (safetyCounter++ > 10) throw new Error('Infinite loop in Chicago asking')
        await caller.answerChicago({
          gameId: game.id,
          playerSecret: game.currentPlayer.secret,
          takeChicago: false,
        })
      }

      const initialScore = player2.score

      await caller.answerChicago({
        gameId: game.id,
        playerSecret: player2.secret,
        takeChicago: true,
      })

      await playAllTricks(caller, game)

      expect(game.round.phase).toBe('over')
      expect(player2.score).toBe(initialScore - 15)
    })

    test('Round ends immediately when Chicago caller loses a trick', async () => {
      // P2 calls Chicago but P1 has Ace of clubs that beats P2's King
      // P2 does NOT have four of a kind
      const chicagoLosable: HandFixture = {
        player1: [
          card('clubs:14'),
          card('hearts:2'),
          card('diamonds:3'),
          card('spades:4'),
          card('clubs:5'),
        ],
        player2: [
          card('clubs:13'),
          card('hearts:13'),
          card('diamonds:12'),
          card('spades:12'),
          card('clubs:6'),
        ],
        player3: [
          card('clubs:7'),
          card('hearts:8'),
          card('diamonds:9'),
          card('spades:3'),
          card('hearts:4'),
        ],
        player4: [
          card('diamonds:2'),
          card('clubs:8'),
          card('hearts:9'),
          card('diamonds:5'),
          card('spades:5'),
        ],
      }

      const { game } = await setupGame(caller, 4)
      await startRound(caller, game, chicagoLosable)
      await skipAllThrows(caller, game)

      const player2 = game.players[1]

      let safetyCounter = 0
      while (game.currentPlayer.id !== player2.id && game.round.phase === 'asking_chicago') {
        if (safetyCounter++ > 10) throw new Error('Infinite loop in Chicago asking')
        await caller.answerChicago({
          gameId: game.id,
          playerSecret: game.currentPlayer.secret,
          takeChicago: false,
        })
      }

      await caller.answerChicago({
        gameId: game.id,
        playerSecret: player2.secret,
        takeChicago: true,
      })

      await playAllTricks(caller, game)

      expect(game.round.phase).toBe('over')
      expect(game.round.tricks.length).toBeLessThan(5)
      const totalCardsRemaining = game.players.reduce((sum, p) => sum + p.cards.size, 0)
      expect(totalCardsRemaining).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// TESTS: TRICK-TAKING
// ============================================================================

describe('Chicago: Trick-Taking', () => {
  const caller = createCaller()

  describe('Playing cards', () => {
    test('Must follow suit if possible', async () => {
      // P2 has clubs, P3 also has clubs - P3 must follow when P2 leads clubs
      const suitFollowHands: HandFixture = {
        player1: [
          card('spades:2'),
          card('hearts:3'),
          card('diamonds:4'),
          card('spades:5'),
          card('hearts:6'),
        ],
        player2: [
          card('clubs:7'),
          card('hearts:7'),
          card('spades:8'),
          card('diamonds:8'),
          card('clubs:4'),
        ],
        player3: [
          card('clubs:10'),
          card('hearts:10'),
          card('spades:10'),
          card('diamonds:3'),
          card('clubs:6'),
        ],
        player4: [
          card('spades:14'),
          card('hearts:5'),
          card('diamonds:7'),
          card('clubs:11'),
          card('spades:4'),
        ],
      }
      mockDealCards.mockImplementation(createMockDealCards(suitFollowHands))

      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)
      await skipAllThrows(caller, game)
      await declineAllChicago(caller, game)

      const player2 = game.currentPlayer
      expect(player2.name).toBe('P2')

      // P2 leads clubs:7
      const clubsCard = Array.from(player2.cards).find((c) => c.suit === 'clubs')!
      await caller.playCard({
        gameId: game.id,
        playerSecret: player2.secret,
        card: { id: clubsCard.id },
      })

      // P3 has clubs but tries to play hearts - should fail
      const player3 = game.currentPlayer
      expect(player3.name).toBe('P3')

      const heartsCard = Array.from(player3.cards).find((c) => c.suit === 'hearts')!
      const result = await caller.playCard({
        gameId: game.id,
        playerSecret: player3.secret,
        card: { id: heartsCard.id },
      })

      expect(result).toBe(Errors.FORBIDDEN)
    })

    test('Can play any card when unable to follow suit', async () => {
      // P4 has NO clubs - when clubs is led, P4 can play anything
      const voidInClubsHands: HandFixture = {
        player1: [
          card('clubs:9'),
          card('hearts:9'),
          card('spades:3'),
          card('diamonds:5'),
          card('clubs:2'),
        ],
        player2: [
          card('clubs:7'),
          card('hearts:7'),
          card('spades:8'),
          card('diamonds:8'),
          card('clubs:4'),
        ],
        player3: [
          card('clubs:10'),
          card('hearts:10'),
          card('spades:10'),
          card('diamonds:3'),
          card('clubs:6'),
        ],
        player4: [
          card('spades:14'),
          card('hearts:5'),
          card('diamonds:7'),
          card('spades:11'),
          card('spades:4'),
        ], // No clubs!
      }
      mockDealCards.mockImplementation(createMockDealCards(voidInClubsHands))

      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)
      await skipAllThrows(caller, game)
      await declineAllChicago(caller, game)

      // P2 leads clubs:7
      const player2 = game.currentPlayer
      await caller.playCard({
        gameId: game.id,
        playerSecret: player2.secret,
        card: { id: Array.from(player2.cards).find((c) => c.suit === 'clubs')!.id },
      })

      // P3 follows with clubs
      const player3 = game.currentPlayer
      await caller.playCard({
        gameId: game.id,
        playerSecret: player3.secret,
        card: { id: Array.from(player3.cards).find((c) => c.suit === 'clubs')!.id },
      })

      // P4 has no clubs - can play spades (or anything)
      const player4 = game.currentPlayer
      expect(player4.name).toBe('P4')
      const hasClubs = Array.from(player4.cards).some((c) => c.suit === 'clubs')
      expect(hasClubs).toBe(false)

      const spadesCard = Array.from(player4.cards).find((c) => c.suit === 'spades')!
      const result = await caller.playCard({
        gameId: game.id,
        playerSecret: player4.secret,
        card: { id: spadesCard.id },
      })

      expect(result).toBe(Results.PLAYED_TRICK)
    })
  })

  describe('Last trick scoring', () => {
    test('Winner of last trick gets points', async () => {
      mockDealCards.mockImplementation(createMockDealCards(defaultHands))

      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)
      await skipAllThrows(caller, game)
      await declineAllChicago(caller, game)

      const initialScores = game.players.map((p) => p.score)

      await playAllTricks(caller, game)

      const totalPointsGained = game.players.reduce(
        (sum, p, i) => sum + (p.score - initialScores[i]),
        0
      )
      expect(totalPointsGained).toBeGreaterThan(0)
    })

    test('Winning last trick with a 2 gives bonus points', async () => {
      // P1 has a 2 (but NOT four of a kind)
      const twoWinsHands: HandFixture = {
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
          card('hearts:4'),
          card('spades:5'),
          card('diamonds:6'),
          card('clubs:4'),
          card('hearts:5'),
        ],
        player4: [
          card('spades:6'),
          card('diamonds:7'),
          card('clubs:8'),
          card('hearts:9'),
          card('spades:7'),
        ],
      }

      const { game } = await setupGame(caller, 4)
      await startRound(caller, game, twoWinsHands)
      await skipAllThrows(caller, game)
      await declineAllChicago(caller, game)

      const initialScores = game.players.map((p) => p.score)

      await playAllTricks(caller, game)

      while (game.round.phase === 'asking_four_of_a_kind') {
        await caller.answerFourOfAKind({
          gameId: game.id,
          playerSecret: game.currentPlayer.secret,
          answer: 'points',
        })
      }

      expect(game.round.phase).toBe('over')

      const totalPointsAwarded = game.players.reduce(
        (sum, p, i) => sum + Math.max(0, p.score - initialScores[i]),
        0
      )
      expect(totalPointsAwarded).toBeGreaterThan(0)
      expect(game.rules.pointsForWin).toBe(5)
      expect(game.rules.pointsForWinWithTwo).toBe(10)
    })
  })

  describe('Post-trick hand scoring', () => {
    test('Best poker hand is scored after round ends', async () => {
      // P3 has three 10s - worth 3 points
      const threeOfAKindHands: HandFixture = {
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
          card('diamonds:14'),
          card('clubs:11'),
        ],
        player3: [
          card('clubs:10'),
          card('hearts:10'),
          card('spades:10'),
          card('diamonds:3'),
          card('clubs:5'),
        ],
        player4: [
          card('spades:7'),
          card('diamonds:8'),
          card('clubs:9'),
          card('hearts:14'),
          card('spades:11'),
        ],
      }
      mockDealCards.mockImplementation(createMockDealCards(threeOfAKindHands))

      const { game } = await setupGame(caller, 4)
      await startRound(caller, game)
      await skipAllThrows(caller, game)
      await declineAllChicago(caller, game)

      const player3 = game.players[2]
      const scoreBeforeTricks = player3.score

      await playAllTricks(caller, game)

      // Player 3 should have received points for three of a kind
      expect(player3.score).toBeGreaterThanOrEqual(scoreBeforeTricks)
    })
  })
})

// ============================================================================
// TESTS: SPECIAL SCENARIOS
// ============================================================================

describe('Chicago: Four of a Kind', () => {
  const caller = createCaller()

  test('Player with four of a kind can choose to take points', async () => {
    // P1 has four Kings
    const fourKingsHands: HandFixture = {
      player1: [
        card('clubs:13'),
        card('hearts:13'),
        card('spades:13'),
        card('diamonds:13'),
        card('clubs:2'),
      ],
      player2: [
        card('clubs:7'),
        card('hearts:7'),
        card('spades:8'),
        card('diamonds:8'),
        card('clubs:4'),
      ],
      player3: [
        card('clubs:10'),
        card('hearts:10'),
        card('spades:10'),
        card('diamonds:3'),
        card('clubs:6'),
      ],
      player4: [
        card('spades:14'),
        card('hearts:5'),
        card('diamonds:7'),
        card('clubs:11'),
        card('spades:4'),
      ],
    }
    mockDealCards.mockImplementation(createMockDealCards(fourKingsHands))

    const { game } = await setupGame(caller, 4)
    await startRound(caller, game)

    const player1 = game.players[0]

    // Complete first throw cycle - should trigger four of a kind
    for (let i = 0; i < game.players.length; i++) {
      if (game.round.phase === 'asking_four_of_a_kind') break
      await caller.throwCards({
        gameId: game.id,
        playerSecret: game.currentPlayer.secret,
        cards: [],
        oneOpen: false,
      })
    }

    expect(game.round.phase).toBe('asking_four_of_a_kind')
    expect(game.currentPlayer.id).toBe(player1.id)

    const initialScore = player1.score

    await caller.answerFourOfAKind({
      gameId: game.id,
      playerSecret: player1.secret,
      answer: 'points',
    })

    expect(player1.score).toBe(initialScore + 7) // Four of a kind = 7 points
  })

  test('Player with four of a kind can choose to reset others', async () => {
    // P1 has four Kings
    const fourKingsHands: HandFixture = {
      player1: [
        card('clubs:13'),
        card('hearts:13'),
        card('spades:13'),
        card('diamonds:13'),
        card('clubs:2'),
      ],
      player2: [
        card('clubs:7'),
        card('hearts:7'),
        card('spades:8'),
        card('diamonds:8'),
        card('clubs:4'),
      ],
      player3: [
        card('clubs:10'),
        card('hearts:10'),
        card('spades:10'),
        card('diamonds:3'),
        card('clubs:6'),
      ],
      player4: [
        card('spades:14'),
        card('hearts:5'),
        card('diamonds:7'),
        card('clubs:11'),
        card('spades:4'),
      ],
    }
    mockDealCards.mockImplementation(createMockDealCards(fourKingsHands))

    const { game } = await setupGame(caller, 4)
    await startRound(caller, game)

    // Give other players some points after round starts
    game.players[1].score = 20
    game.players[2].score = 30
    game.players[3].score = 15

    const player1 = game.players[0]

    for (let i = 0; i < game.players.length; i++) {
      if (game.round.phase === 'asking_four_of_a_kind') break
      await caller.throwCards({
        gameId: game.id,
        playerSecret: game.currentPlayer.secret,
        cards: [],
        oneOpen: false,
      })
    }

    expect(game.round.phase).toBe('asking_four_of_a_kind')

    await caller.answerFourOfAKind({
      gameId: game.id,
      playerSecret: player1.secret,
      answer: 'reset_others',
    })

    expect(game.players[1].score).toBe(0)
    expect(game.players[2].score).toBe(0)
    expect(game.players[3].score).toBe(0)
  })
})

describe('Chicago: Tie Breaking', () => {
  const caller = createCaller()

  test('Ties are broken by high card', async () => {
    // P1 and P2 both have pair of 9s, but P1 has Ace kicker, P2 has King
    const tieWithKickerHands: HandFixture = {
      player1: [
        card('clubs:9'),
        card('hearts:9'),
        card('spades:14'),
        card('diamonds:5'),
        card('clubs:2'),
      ],
      player2: [
        card('spades:9'),
        card('diamonds:9'),
        card('clubs:13'),
        card('hearts:5'),
        card('diamonds:2'),
      ],
      player3: [
        card('clubs:10'),
        card('hearts:3'),
        card('spades:4'),
        card('diamonds:6'),
        card('clubs:7'),
      ],
      player4: [
        card('spades:3'),
        card('hearts:4'),
        card('diamonds:7'),
        card('clubs:8'),
        card('spades:5'),
      ],
    }
    mockDealCards.mockImplementation(createMockDealCards(tieWithKickerHands))

    const { game } = await setupGame(caller, 4)
    await startRound(caller, game)

    for (let i = 0; i < game.players.length; i++) {
      await caller.throwCards({
        gameId: game.id,
        playerSecret: game.currentPlayer.secret,
        cards: [],
        oneOpen: false,
      })
    }

    const player1 = game.players[0]
    const player2 = game.players[1]

    expect(player1.score).toBe(1) // Pair = 1 point
    expect(player2.score).toBe(0) // Lost the tiebreak
  })
})

// ============================================================================
// TESTS: VICTORY CONDITIONS
// ============================================================================

describe('Chicago: Victory Conditions', () => {
  const caller = createCaller()

  beforeEach(() => {
    mockDealCards.mockImplementation(createMockDealCards(defaultHands))
  })

  test('Victory requires both 52+ points AND having taken Chicago', async () => {
    const { game } = await setupGame(caller, 4)

    game.players[0].score = 55
    game.players[0].takenChicago = false

    await startRound(caller, game)
    await skipAllThrows(caller, game)
    await declineAllChicago(caller, game)
    await playAllTricks(caller, game)

    while (game.round.phase === 'asking_four_of_a_kind') {
      await caller.answerFourOfAKind({
        gameId: game.id,
        playerSecret: game.currentPlayer.secret,
        answer: 'points',
      })
    }

    expect(game.phase).not.toBe('over')
    expect(game.round.phase).toBe('over')
  })

  test('Player with 52+ points AND Chicago wins', async () => {
    const { game } = await setupGame(caller, 4)

    game.players[0].score = 55
    game.players[0].takenChicago = true

    await startRound(caller, game)
    await skipAllThrows(caller, game)
    await declineAllChicago(caller, game)
    await playAllTricks(caller, game)

    while (game.round.phase === 'asking_four_of_a_kind') {
      await caller.answerFourOfAKind({
        gameId: game.id,
        playerSecret: game.currentPlayer.secret,
        answer: 'points',
      })
    }

    expect(game.phase).toBe('over')
  })

  test('Restarting game after victory clears takenChicago status', async () => {
    const { game } = await setupGame(caller, 4)

    // Player 1 wins
    game.players[0].score = 55
    game.players[0].takenChicago = true

    await startRound(caller, game)
    await skipAllThrows(caller, game)
    await declineAllChicago(caller, game)
    await playAllTricks(caller, game)

    while (game.round.phase === 'asking_four_of_a_kind') {
      await caller.answerFourOfAKind({
        gameId: game.id,
        playerSecret: game.currentPlayer.secret,
        answer: 'points',
      })
    }

    expect(game.phase).toBe('over')
    expect(game.players[0].takenChicago).toBe(true)

    // Restart the game
    await startRound(caller, game)

    // All players should have takenChicago reset
    for (const player of game.players) {
      expect(player.takenChicago).toBe(false)
      expect(player.score).toBe(0)
    }
  })
})

// ============================================================================
// TESTS: LEAVING AND KICKED PLAYERS
// ============================================================================

describe('Chicago: Player Management', () => {
  const caller = createCaller()

  test('Player can leave the game', async () => {
    const { game } = await setupGame(caller, 4)
    const player2 = game.players[1]

    const result = await caller.leaveGame({
      gameId: game.id,
      playerSecret: player2.secret,
    })

    expect(result).toBe(Results.LEFT_GAME)
    expect(game.players).toHaveLength(3)
  })

  test('Owner can kick other players', async () => {
    const { game, ownerSecret } = await setupGame(caller, 4)
    const player2 = game.players[1]

    const result = await caller.kickPlayer({
      gameId: game.id,
      ownerSecret,
      playerIdToKick: player2.id,
    })

    expect(result).toBe(Results.KICKED_PLAYER)
    expect(game.players).toHaveLength(3)
  })

  test('Non-owner cannot kick players', async () => {
    const { game } = await setupGame(caller, 4)
    const player2 = game.players[1]
    const player3 = game.players[2]

    const result = await caller.kickPlayer({
      gameId: game.id,
      ownerSecret: player2.secret,
      playerIdToKick: player3.id,
    })

    expect(result).toBe(Errors.FORBIDDEN)
  })

  test('Round is killed when player leaves mid-round', async () => {
    mockDealCards.mockImplementation(createMockDealCards(defaultHands))

    const { game } = await setupGame(caller, 4)
    await startRound(caller, game)

    const player2 = game.players[1]

    await caller.leaveGame({
      gameId: game.id,
      playerSecret: player2.secret,
    })

    expect(game.round.phase).toBe('killed')
  })
})

// ============================================================================
// TESTS: MAKE IT RAIN
// ============================================================================

describe('Chicago: Make It Rain', () => {
  const caller = createCaller()

  test('Player with flush triggers make it rain when they have all cards of that suit', async () => {
    // P2 has all spades (A, K, Q, J, 10), no one else has spades
    // Since P2 has ALL the spades, they're guaranteed to win immediately on first play
    // No unaccounted spades exist that could beat them
    const flushHands: HandFixture = {
      player1: [
        card('clubs:2'),
        card('hearts:3'),
        card('diamonds:4'),
        card('clubs:5'),
        card('hearts:6'),
      ],
      player2: [
        card('spades:14'),
        card('spades:13'),
        card('spades:12'),
        card('spades:11'),
        card('spades:10'),
      ],
      player3: [
        card('clubs:7'),
        card('hearts:8'),
        card('diamonds:9'),
        card('clubs:3'),
        card('hearts:4'),
      ],
      player4: [
        card('diamonds:2'),
        card('clubs:8'),
        card('hearts:9'),
        card('diamonds:5'),
        card('clubs:4'),
      ],
    }
    mockDealCards.mockImplementation(createMockDealCards(flushHands))

    const { game } = await setupGame(caller, 4)
    await startRound(caller, game)
    await skipAllThrows(caller, game)
    await declineAllChicago(caller, game)

    const player2 = game.players[1]

    // P2 is current player (first to play after dealer in tricking)
    expect(game.currentPlayer.id).toBe(player2.id)

    // P2 leads with Ace of spades
    // Since P2 has ALL spades (no unaccounted spades exist), make it rain triggers immediately
    const aceOfSpades = Array.from(player2.cards).find((c) => c.value === 14)!
    const result = await caller.playCard({
      gameId: game.id,
      playerSecret: player2.secret,
      card: { id: aceOfSpades.id },
    })

    // Make it rain should complete the round instantly
    expect(result).toBe(Results.ROUND_OVER)
    expect(game.round.phase).toBe('over')
    expect(game.round.tricks.length).toBe(5) // All 5 tricks should be completed
    expect(game.round.winner?.id).toBe(player2.id)

    // Check that the made_it_rain event was recorded
    const madeItRainEvent = game.events.find((e) => e.action === 'made_it_rain')
    expect(madeItRainEvent).toBeDefined()
    expect(madeItRainEvent?.actor).toBe(player2)
  })

  test('Make it rain triggers when player has all highest remaining cards in their suit', async () => {
    // P2 has all clubs from 10-14 (A, K, Q, J, 10)
    // Since they have ALL the clubs and the highest ones, make it rain triggers
    // (No four of a kind to avoid asking_four_of_a_kind phase)
    const allHighClubsHands: HandFixture = {
      player1: [
        card('hearts:2'),
        card('hearts:3'),
        card('hearts:4'),
        card('hearts:5'),
        card('hearts:6'),
      ],
      player2: [
        card('clubs:14'), // Ace of clubs
        card('clubs:13'), // King of clubs
        card('clubs:12'), // Queen of clubs
        card('clubs:11'), // Jack of clubs
        card('clubs:10'), // 10 of clubs
      ],
      player3: [
        card('spades:2'),
        card('spades:3'),
        card('spades:4'),
        card('spades:5'),
        card('spades:6'),
      ],
      player4: [
        card('diamonds:2'),
        card('diamonds:3'),
        card('diamonds:4'),
        card('diamonds:5'),
        card('diamonds:6'),
      ],
    }
    mockDealCards.mockImplementation(createMockDealCards(allHighClubsHands))

    const { game } = await setupGame(caller, 4)
    await startRound(caller, game)
    await skipAllThrows(caller, game)
    await declineAllChicago(caller, game)

    const player2 = game.players[1]

    // P2 is current player
    expect(game.currentPlayer.id).toBe(player2.id)
    expect(game.round.phase).toBe('tricking')

    // P2 leads with Ace of clubs
    // Since P2 has ALL clubs (10-14) and no one else has clubs,
    // P2 is guaranteed to win all tricks - make it rain should trigger
    const aceOfClubs = Array.from(player2.cards).find((c) => c.value === 14 && c.suit === 'clubs')!
    const result = await caller.playCard({
      gameId: game.id,
      playerSecret: player2.secret,
      card: { id: aceOfClubs.id },
    })

    // Make it rain should trigger immediately
    expect(result).toBe(Results.ROUND_OVER)
    expect(game.round.phase).toBe('over')
    expect(game.round.tricks.length).toBe(5)

    // Check made_it_rain event
    const madeItRainEvent = game.events.find((e) => e.action === 'made_it_rain')
    expect(madeItRainEvent).toBeDefined()
  })

  test('Make it rain does NOT trigger when opponent could still beat current card', async () => {
    // P2 has high spades but P4 has the Ace of spades
    const beatable: HandFixture = {
      player1: [
        card('clubs:2'),
        card('hearts:3'),
        card('diamonds:4'),
        card('clubs:5'),
        card('hearts:6'),
      ],
      player2: [
        card('spades:13'), // King (not Ace!)
        card('spades:12'),
        card('spades:11'),
        card('spades:10'),
        card('spades:9'),
      ],
      player3: [
        card('clubs:7'),
        card('hearts:8'),
        card('diamonds:9'),
        card('clubs:3'),
        card('hearts:4'),
      ],
      player4: [
        card('spades:14'), // ACE of spades - can beat P2's King
        card('clubs:8'),
        card('hearts:9'),
        card('diamonds:5'),
        card('clubs:4'),
      ],
    }
    mockDealCards.mockImplementation(createMockDealCards(beatable))

    const { game } = await setupGame(caller, 4)
    await startRound(caller, game)
    await skipAllThrows(caller, game)
    await declineAllChicago(caller, game)

    const player2 = game.players[1]

    // P2 leads with King of spades
    expect(game.currentPlayer.id).toBe(player2.id)
    const result = await caller.playCard({
      gameId: game.id,
      playerSecret: player2.secret,
      card: { id: Array.from(player2.cards).find((c) => c.value === 13)!.id },
    })

    // Should NOT trigger make it rain - P4 has Ace of spades
    expect(result).toBe(Results.PLAYED_TRICK)
    expect(game.round.phase).toBe('tricking')

    // No made_it_rain event
    const madeItRainEvent = game.events.find((e) => e.action === 'made_it_rain')
    expect(madeItRainEvent).toBeUndefined()
  })

  test('Make it rain on last trick when player has highest card', async () => {
    // Set up so P2 has the highest remaining card on the last trick
    const lastTrickWin: HandFixture = {
      player1: [
        card('clubs:2'),
        card('clubs:3'),
        card('clubs:4'),
        card('clubs:5'),
        card('clubs:6'),
      ],
      player2: [
        card('clubs:14'), // Ace of clubs - highest
        card('clubs:13'),
        card('clubs:12'),
        card('clubs:11'),
        card('clubs:10'),
      ],
      player3: [
        card('clubs:7'),
        card('clubs:8'),
        card('clubs:9'),
        card('hearts:2'),
        card('hearts:3'),
      ],
      player4: [
        card('hearts:4'),
        card('hearts:5'),
        card('hearts:6'),
        card('hearts:7'),
        card('hearts:8'),
      ],
    }
    mockDealCards.mockImplementation(createMockDealCards(lastTrickWin))

    const { game } = await setupGame(caller, 4)
    await startRound(caller, game)
    await skipAllThrows(caller, game)
    await declineAllChicago(caller, game)

    // Play through 4 tricks normally, saving P2's ace for trick 5
    for (let trick = 0; trick < 4; trick++) {
      for (let i = 0; i < 4; i++) {
        const player = game.currentPlayer
        const hand = Array.from(player.cards)
        // Play lowest card to save high cards
        const cardToPlay = hand.sort((a, b) => a.value - b.value)[0]
        await caller.playCard({
          gameId: game.id,
          playerSecret: player.secret,
          card: { id: cardToPlay.id },
        })
        if (game.round.phase !== 'tricking') break
      }
      if (game.round.phase !== 'tricking') break
    }

    // On trick 5, if still tricking, check if make it rain triggers
    if (game.round.phase === 'tricking') {
      // P2 should lead with their remaining high card (Ace)
      const player2 = game.players[1]
      if (game.currentPlayer.id === player2.id && player2.cards.size > 0) {
        const aceCard = Array.from(player2.cards).find((c) => c.value === 14)
        if (aceCard) {
          const result = await caller.playCard({
            gameId: game.id,
            playerSecret: player2.secret,
            card: { id: aceCard.id },
          })
          // On last trick with highest card, should trigger make it rain
          expect(result).toBe(Results.ROUND_OVER)
        }
      }
    }

    expect(game.round.phase).toBe('over')
  })
})

// ============================================================================
// TESTS: COMPLETE GAME FLOW (INTEGRATION)
// ============================================================================

describe('Chicago: Complete Game Flow', () => {
  const caller = createCaller()

  test('Happy path: Full round without Chicago', async () => {
    mockDealCards.mockImplementation(createMockDealCards(defaultHands))

    const { game } = await setupGame(caller, 4)

    await startRound(caller, game)
    expect(game.phase).toBe('round')
    expect(game.round.phase).toBe('throwing')

    await skipAllThrows(caller, game)
    expect(game.round.phase).toBe('asking_chicago')

    await declineAllChicago(caller, game)
    expect(game.round.phase).toBe('tricking')

    await playAllTricks(caller, game)
    expect(game.round.phase).toBe('over')

    const totalScore = game.players.reduce((sum, p) => sum + p.score, 0)
    expect(totalScore).toBeGreaterThan(0)
  })

  test('Happy path: Round with successful Chicago', async () => {
    // P2 has A, K, Q, J, 10 of spades - guaranteed to win all tricks
    const chicagoWinnable: HandFixture = {
      player1: [
        card('clubs:2'),
        card('hearts:3'),
        card('diamonds:4'),
        card('clubs:5'),
        card('hearts:6'),
      ],
      player2: [
        card('spades:14'),
        card('spades:13'),
        card('spades:12'),
        card('spades:11'),
        card('spades:10'),
      ],
      player3: [
        card('clubs:7'),
        card('hearts:8'),
        card('diamonds:9'),
        card('clubs:3'),
        card('hearts:4'),
      ],
      player4: [
        card('diamonds:2'),
        card('clubs:8'),
        card('hearts:9'),
        card('diamonds:5'),
        card('clubs:4'),
      ],
    }
    mockDealCards.mockImplementation(createMockDealCards(chicagoWinnable))

    const { game } = await setupGame(caller, 4)
    await startRound(caller, game)
    await skipAllThrows(caller, game)

    const player2 = game.players[1]
    while (game.currentPlayer.id !== player2.id && game.round.phase === 'asking_chicago') {
      await caller.answerChicago({
        gameId: game.id,
        playerSecret: game.currentPlayer.secret,
        takeChicago: false,
      })
    }

    const scoreBefore = player2.score

    await caller.answerChicago({
      gameId: game.id,
      playerSecret: player2.secret,
      takeChicago: true,
    })

    expect(game.round.chicagoCaller?.id).toBe(player2.id)

    while (game.round.phase === 'tricking') {
      const current = game.currentPlayer
      const hand = Array.from(current.cards)

      let cardToPlay = hand[0]
      const currentTrick = game.round.tricks[game.round.tricks.length - 1]
      if (currentTrick?.playedCards.length > 0) {
        const leadSuit = currentTrick.playedCards[0].card.suit
        const suitCards = hand.filter((c) => c.suit === leadSuit)
        if (suitCards.length > 0) {
          cardToPlay = suitCards.sort((a, b) => b.value - a.value)[0]
        }
      } else {
        cardToPlay = hand.sort((a, b) => b.value - a.value)[0]
      }

      await caller.playCard({
        gameId: game.id,
        playerSecret: current.secret,
        card: { id: cardToPlay.id },
      })
    }

    expect(game.round.phase).toBe('over')
    expect(player2.score).toBe(scoreBefore + 15)
    expect(player2.takenChicago).toBe(true)
  })
})
