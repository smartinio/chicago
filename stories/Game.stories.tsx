import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Card, PlayerSnapshot, Snapshot } from '../shared/types'
import { Game } from '../views/Game'
import { setSnapshot } from '../store'
// Import the same mock trpc that Game.tsx will use in Storybook
import { trpc } from '../.storybook/trpc-mock'
import { observable } from '@trpc/server/observable'
import type { AppRouter } from '../server/routers/_app'
import type { TRPCLink } from '@trpc/client'

// A no-op link that does nothing - for Storybook where we don't need real tRPC
const noopLink: TRPCLink<AppRouter> = () => {
  return ({ op }) => {
    return observable((observer) => {
      // For subscriptions, just don't emit anything
      // For queries/mutations, immediately complete with undefined
      if (op.type !== 'subscription') {
        observer.next({ result: { data: undefined } })
        observer.complete()
      }
      return () => {}
    })
  }
}

// Sample cards
const sampleCards: Record<string, Card> = {
  aceSpades: { id: 'spades:14', suit: 'spades', value: 14 },
  kingHearts: { id: 'hearts:13', suit: 'hearts', value: 13 },
  queenDiamonds: { id: 'diamonds:12', suit: 'diamonds', value: 12 },
  jackClubs: { id: 'clubs:11', suit: 'clubs', value: 11 },
  tenSpades: { id: 'spades:10', suit: 'spades', value: 10 },
  nineHearts: { id: 'hearts:9', suit: 'hearts', value: 9 },
  eightDiamonds: { id: 'diamonds:8', suit: 'diamonds', value: 8 },
  sevenClubs: { id: 'clubs:7', suit: 'clubs', value: 7 },
  sixSpades: { id: 'spades:6', suit: 'spades', value: 6 },
  fiveHearts: { id: 'hearts:5', suit: 'hearts', value: 5 },
  fourDiamonds: { id: 'diamonds:4', suit: 'diamonds', value: 4 },
  threeClubs: { id: 'clubs:3', suit: 'clubs', value: 3 },
  twoSpades: { id: 'spades:2', suit: 'spades', value: 2 },
  twoHearts: { id: 'hearts:2', suit: 'hearts', value: 2 },
  twoDiamonds: { id: 'diamonds:2', suit: 'diamonds', value: 2 },
  twoClubs: { id: 'clubs:2', suit: 'clubs', value: 2 },
}

const defaultRules: Snapshot['rules'] = {
  throwScoreThreshold: 40,
  pointsForWin: 5,
  pointsForWinWithTwo: 10,
  numberOfThrows: 3,
  chicagoRequiresBestHand: true,
  chicagoCanBeCalledBeforeFifteen: false,
  oneOpenMode: 'last',
  handPoints: {
    highCard: 0,
    pair: 1,
    twoPair: 2,
    threeOfAKind: 3,
    straight: 5,
    flush: 6,
    fullHouse: 7,
    fourOfAKind: 10,
    straightFlush: 15,
    royalStraightFlush: 20,
  },
}

// Helper to create player snapshot
const createPlayer = (
  id: string,
  name: string,
  score: number,
  playedCards: Card[] = [],
  takenChicago = false
): PlayerSnapshot => ({
  id,
  name,
  score,
  playedCards,
  takenChicago,
})

// Base snapshot with sensible defaults
const createBaseSnapshot = (overrides: Partial<Snapshot> = {}): Snapshot => ({
  gameId: 'game-1',
  playerId: 'player-1',
  playerSecret: 'secret-1',
  currentPlayerId: 'player-1',
  isMyTurn: true,
  myCards: [
    sampleCards.aceSpades,
    sampleCards.kingHearts,
    sampleCards.queenDiamonds,
    sampleCards.jackClubs,
    sampleCards.tenSpades,
  ],
  dealerId: 'player-1',
  events: [],
  gamePhase: 'round',
  name: 'Test Game',
  ownerId: 'player-1',
  players: [
    createPlayer('player-1', 'You', 12, []),
    createPlayer('player-2', 'Alice', 8, []),
    createPlayer('player-3', 'Bob', 15, []),
    createPlayer('player-4', 'Charlie', 5, []),
  ],
  roundPhase: 'tricking',
  canStart: false,
  rules: defaultRules,
  trickCount: 1,
  oneOpenAvailable: false,
  ...overrides,
})

// tRPC Provider for Storybook - provides the context Game.tsx needs
const TrpcProvider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false, enabled: false },
          mutations: { retry: false },
        },
      })
  )
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [noopLink],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}

// Wrapper that pre-populates the zustand store and renders Game
const GameWrapper = ({ snapshot }: { snapshot: Snapshot }) => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSnapshot(snapshot)
    setReady(true)
  }, [snapshot])

  if (!ready) return null

  return (
    <Game
      gameId={snapshot.gameId}
      playerId={snapshot.playerId}
      playerSecret={snapshot.playerSecret}
    />
  )
}

const meta: Meta<typeof GameWrapper> = {
  title: 'Game/Game',
  component: GameWrapper,
  decorators: [
    (Story) => (
      <TrpcProvider>
        <ChakraProvider>
          <Story />
        </ChakraProvider>
      </TrpcProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof GameWrapper>

// ==================== GAME STORIES ====================

export const Throwing: Story = {
  name: 'Throwing Phase',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'throwing',
      isMyTurn: true,
      oneOpenAvailable: true,
      events: [
        { id: '1', action: 'started_round', actorId: 'server', data: {} },
        { id: '2', action: 'throw_cycle_started', actorId: 'server', data: { throwNumber: 1 } },
      ],
    }),
  },
}

export const Tricking: Story = {
  name: 'Tricking Phase',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'tricking',
      isMyTurn: true,
      trickCount: 2,
      startingCard: sampleCards.kingHearts,
      players: [
        createPlayer('player-1', 'You', 12, [sampleCards.aceSpades, sampleCards.kingHearts]),
        createPlayer('player-2', 'Alice', 8, [sampleCards.queenDiamonds, sampleCards.nineHearts]),
        createPlayer('player-3', 'Bob', 15, [sampleCards.jackClubs, sampleCards.eightDiamonds]),
        createPlayer('player-4', 'Charlie', 5, [sampleCards.fiveHearts, sampleCards.fourDiamonds]),
      ],
      events: [
        { id: '1', action: 'tricking_phase_started', actorId: 'server', data: {} },
        { id: '2', action: 'won_trick', actorId: 'player-1', data: {} },
      ],
    }),
  },
}

export const ChicagoQuestion: Story = {
  name: 'Chicago Question',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'asking_chicago',
      isMyTurn: true,
      events: [
        { id: '1', action: 'started_round', actorId: 'server', data: {} },
        { id: '2', action: 'threw_cards', actorId: 'player-2', data: { count: 2 } },
        { id: '3', action: 'threw_cards', actorId: 'player-3', data: { count: 0 } },
      ],
    }),
  },
}

export const OneOpenOffer: Story = {
  name: 'One Open Offer',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'asking_one_open',
      isMyTurn: true,
      openCard: sampleCards.aceSpades,
      events: [
        { id: '1', action: 'started_round', actorId: 'server', data: {} },
        { id: '2', action: 'throw_cycle_started', actorId: 'server', data: { throwNumber: 3 } },
      ],
    }),
  },
}

export const FourOfAKind: Story = {
  name: 'Four of a Kind',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'asking_four_of_a_kind',
      isMyTurn: true,
      trickCount: 5,
      players: [
        createPlayer('player-1', 'You', 35, [
          sampleCards.twoSpades,
          sampleCards.twoHearts,
          sampleCards.twoDiamonds,
          sampleCards.twoClubs,
          sampleCards.aceSpades,
        ]),
        createPlayer('player-2', 'Alice', 28, [
          sampleCards.kingHearts,
          sampleCards.queenDiamonds,
          sampleCards.jackClubs,
          sampleCards.tenSpades,
          sampleCards.nineHearts,
        ]),
        createPlayer('player-3', 'Bob', 42, []),
        createPlayer('player-4', 'Charlie', 15, []),
      ],
      events: [
        { id: '1', action: 'tricking_phase_started', actorId: 'server', data: {} },
        { id: '2', action: 'won_trick', actorId: 'player-1', data: {} },
      ],
    }),
  },
}

export const RoundOver: Story = {
  name: 'Round Over - Deal Cards',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'over',
      canStart: true,
      trickCount: 5,
      myCards: [],
      players: [
        createPlayer('player-1', 'You', 17, [
          sampleCards.aceSpades,
          sampleCards.kingHearts,
          sampleCards.tenSpades,
          sampleCards.sixSpades,
          sampleCards.twoSpades,
        ]),
        createPlayer('player-2', 'Alice', 13, []),
        createPlayer('player-3', 'Bob', 20, []),
        createPlayer('player-4', 'Charlie', 10, []),
      ],
      events: [{ id: '1', action: 'won_round', actorId: 'player-1', data: { points: 5 } }],
    }),
  },
}

export const TwoPlayers: Story = {
  name: 'Two Player Game',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'tricking',
      trickCount: 2,
      players: [
        createPlayer('player-1', 'You', 25, [sampleCards.aceSpades]),
        createPlayer('player-2', 'Opponent', 18, [sampleCards.queenDiamonds]),
      ],
    }),
  },
}

export const GameOver: Story = {
  name: 'Game Over',
  args: {
    snapshot: createBaseSnapshot({
      gamePhase: 'over',
      roundPhase: 'over',
      canStart: true,
      players: [
        createPlayer('player-1', 'You', 52, []),
        createPlayer('player-2', 'Alice', 38, []),
        createPlayer('player-3', 'Bob', 45, []),
        createPlayer('player-4', 'Charlie', 29, []),
      ],
    }),
  },
}

export const NewLobby: Story = {
  name: 'New Lobby (Waiting for Players)',
  args: {
    snapshot: createBaseSnapshot({
      gamePhase: 'new',
      roundPhase: 'throwing', // This shouldn't show Pass button since gamePhase is 'new'
      isMyTurn: true,
      canStart: false,
      myCards: [],
      players: [createPlayer('player-1', 'You', 0, [])],
    }),
  },
}

export const NewLobbyReadyToStart: Story = {
  name: 'New Lobby (Ready to Start)',
  args: {
    snapshot: createBaseSnapshot({
      gamePhase: 'new',
      roundPhase: 'throwing',
      isMyTurn: true,
      canStart: true, // Owner can start
      myCards: [],
      players: [createPlayer('player-1', 'You', 0, []), createPlayer('player-2', 'Alice', 0, [])],
    }),
  },
}
