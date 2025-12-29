import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ChakraProvider, Container, Flex, LightMode } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCReact, httpBatchLink } from '@trpc/react-query'
import { useState } from 'react'
import { Card, PlayerSnapshot, Snapshot } from '../shared/types'
import { Players } from '../views/Players'
import { MiddleAreaContent } from '../views/MiddleAreaContent'
import { setSnapshot } from '../store'
import type { AppRouter } from '../server/routers/_app'

// Create a mock tRPC instance for stories
const mockTrpc = createTRPCReact<AppRouter>()

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

// Mock tRPC provider wrapper
const MockTrpcProvider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
  )
  const [trpcClient] = useState(() =>
    mockTrpc.createClient({
      links: [
        httpBatchLink({
          url: 'http://localhost:3000/api/trpc',
        }),
      ],
    })
  )

  return (
    <mockTrpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </mockTrpc.Provider>
  )
}

// Wrapper component that sets up the snapshot in zustand store
const GameLayoutWrapper = ({ snapshot }: { snapshot: Snapshot }) => {
  setSnapshot(snapshot)

  const dealer = snapshot.players.find((p) => p.id === snapshot.dealerId)
  const currentPlayer = snapshot.players.find((p) => p.id === snapshot.currentPlayerId)

  return (
    <LightMode>
      <Flex
        bgGradient="linear(to-b, gray.200, gray.300)"
        minH="100vh"
        width="100%"
        color="gray.800"
      >
        <Container marginTop="20">
          <Players>
            <MiddleAreaContent
              gamePhase={snapshot.gamePhase}
              roundPhase={snapshot.roundPhase}
              isMyTurn={snapshot.isMyTurn}
              canStart={snapshot.canStart}
              dealerName={dealer?.name}
              currentPlayerName={currentPlayer?.name}
              fourOfAKindCards={[]}
              fourOfAKindPoints={snapshot.rules.handPoints.fourOfAKind}
              playerCount={snapshot.players.length}
            />
          </Players>
        </Container>
      </Flex>
    </LightMode>
  )
}

const meta: Meta<typeof GameLayoutWrapper> = {
  title: 'Game/GameLayout',
  component: GameLayoutWrapper,
  decorators: [
    (Story) => (
      <MockTrpcProvider>
        <ChakraProvider>
          <Story />
        </ChakraProvider>
      </MockTrpcProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof GameLayoutWrapper>

// ==================== TRICKING PHASE STORIES ====================

export const TrickingFirstCard: Story = {
  name: 'Tricking - First Card Played',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'tricking',
      trickCount: 1,
      startingCard: sampleCards.aceSpades,
      players: [
        createPlayer('player-1', 'You', 12, [sampleCards.aceSpades]),
        createPlayer('player-2', 'Alice', 8, []),
        createPlayer('player-3', 'Bob', 15, []),
        createPlayer('player-4', 'Charlie', 5, []),
      ],
      currentPlayerId: 'player-2',
      isMyTurn: false,
    }),
  },
}

export const TrickingMultipleCardsPlayed: Story = {
  name: 'Tricking - Multiple Cards Played (Stacked)',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'tricking',
      trickCount: 3,
      startingCard: sampleCards.tenSpades,
      players: [
        createPlayer('player-1', 'You', 12, [
          sampleCards.aceSpades,
          sampleCards.kingHearts,
          sampleCards.tenSpades,
        ]),
        createPlayer('player-2', 'Alice', 8, [
          sampleCards.queenDiamonds,
          sampleCards.nineHearts,
          sampleCards.sevenClubs,
        ]),
        createPlayer('player-3', 'Bob', 15, [
          sampleCards.jackClubs,
          sampleCards.eightDiamonds,
          sampleCards.sixSpades,
        ]),
        createPlayer('player-4', 'Charlie', 5, [
          sampleCards.fiveHearts,
          sampleCards.fourDiamonds,
          sampleCards.threeClubs,
        ]),
      ],
      currentPlayerId: 'player-1',
      isMyTurn: true,
    }),
  },
}

export const TrickingAllFiveCards: Story = {
  name: 'Tricking - All 5 Cards Played',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'tricking',
      trickCount: 5,
      startingCard: sampleCards.twoSpades,
      players: [
        createPlayer('player-1', 'You', 12, [
          sampleCards.aceSpades,
          sampleCards.kingHearts,
          sampleCards.tenSpades,
          sampleCards.sixSpades,
          sampleCards.twoSpades,
        ]),
        createPlayer('player-2', 'Alice', 8, [
          sampleCards.queenDiamonds,
          sampleCards.nineHearts,
          sampleCards.sevenClubs,
          sampleCards.fiveHearts,
          sampleCards.twoHearts,
        ]),
        createPlayer('player-3', 'Bob', 15, [
          sampleCards.jackClubs,
          sampleCards.eightDiamonds,
          sampleCards.fourDiamonds,
          sampleCards.threeClubs,
          sampleCards.twoDiamonds,
        ]),
        createPlayer('player-4', 'Charlie', 5, [
          sampleCards.aceSpades,
          sampleCards.kingHearts,
          sampleCards.queenDiamonds,
          sampleCards.jackClubs,
          sampleCards.twoClubs,
        ]),
      ],
      currentPlayerId: 'player-1',
      isMyTurn: true,
    }),
  },
}

export const TrickingWithChicagoCaller: Story = {
  name: 'Tricking - With Chicago Caller',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'tricking',
      trickCount: 2,
      chicagoCallerId: 'player-2',
      startingCard: sampleCards.kingHearts,
      players: [
        createPlayer('player-1', 'You', 12, [sampleCards.aceSpades, sampleCards.kingHearts]),
        createPlayer(
          'player-2',
          'Alice',
          8,
          [sampleCards.queenDiamonds, sampleCards.nineHearts],
          true
        ),
        createPlayer('player-3', 'Bob', 15, [sampleCards.jackClubs, sampleCards.eightDiamonds]),
        createPlayer('player-4', 'Charlie', 5, [sampleCards.fiveHearts, sampleCards.fourDiamonds]),
      ],
      currentPlayerId: 'player-3',
      isMyTurn: false,
    }),
  },
}

// ==================== TWO PLAYER GAME ====================

export const TwoPlayerGame: Story = {
  name: 'Two Player Game',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'tricking',
      trickCount: 3,
      startingCard: sampleCards.tenSpades,
      players: [
        createPlayer('player-1', 'You', 25, [
          sampleCards.aceSpades,
          sampleCards.kingHearts,
          sampleCards.tenSpades,
        ]),
        createPlayer('player-2', 'Opponent', 18, [
          sampleCards.queenDiamonds,
          sampleCards.nineHearts,
          sampleCards.sevenClubs,
        ]),
      ],
      currentPlayerId: 'player-1',
      isMyTurn: true,
    }),
  },
}

// ==================== THREE PLAYER GAME ====================

export const ThreePlayerGame: Story = {
  name: 'Three Player Game',
  args: {
    snapshot: createBaseSnapshot({
      roundPhase: 'tricking',
      trickCount: 2,
      startingCard: sampleCards.kingHearts,
      players: [
        createPlayer('player-1', 'You', 20, [sampleCards.aceSpades, sampleCards.kingHearts]),
        createPlayer('player-2', 'Alice', 15, [sampleCards.queenDiamonds, sampleCards.nineHearts]),
        createPlayer('player-3', 'Bob', 22, [sampleCards.jackClubs, sampleCards.eightDiamonds]),
      ],
      currentPlayerId: 'player-1',
      isMyTurn: true,
    }),
  },
}

// ==================== ROUND END STATE ====================

export const RoundOverDealCards: Story = {
  name: 'Round Over - Deal Cards Button',
  args: {
    snapshot: createBaseSnapshot({
      gamePhase: 'round',
      roundPhase: 'over',
      trickCount: 5,
      canStart: true,
      players: [
        createPlayer('player-1', 'You', 17, [
          sampleCards.aceSpades,
          sampleCards.kingHearts,
          sampleCards.tenSpades,
          sampleCards.sixSpades,
          sampleCards.twoSpades,
        ]),
        createPlayer('player-2', 'Alice', 13, [
          sampleCards.queenDiamonds,
          sampleCards.nineHearts,
          sampleCards.sevenClubs,
          sampleCards.fiveHearts,
          sampleCards.twoHearts,
        ]),
        createPlayer('player-3', 'Bob', 20, [
          sampleCards.jackClubs,
          sampleCards.eightDiamonds,
          sampleCards.fourDiamonds,
          sampleCards.threeClubs,
          sampleCards.twoDiamonds,
        ]),
        createPlayer('player-4', 'Charlie', 10, [
          sampleCards.aceSpades,
          sampleCards.kingHearts,
          sampleCards.queenDiamonds,
          sampleCards.jackClubs,
          sampleCards.twoClubs,
        ]),
      ],
      currentPlayerId: 'player-1',
      isMyTurn: true,
    }),
  },
}

// ==================== GAME END STATE ====================

export const GameOver: Story = {
  name: 'Game Over - Winner',
  args: {
    snapshot: createBaseSnapshot({
      gamePhase: 'over',
      roundPhase: 'over',
      trickCount: 5,
      players: [
        createPlayer('player-1', 'You', 52, [
          sampleCards.aceSpades,
          sampleCards.kingHearts,
          sampleCards.tenSpades,
          sampleCards.sixSpades,
          sampleCards.twoSpades,
        ]),
        createPlayer('player-2', 'Alice', 38, [
          sampleCards.queenDiamonds,
          sampleCards.nineHearts,
          sampleCards.sevenClubs,
          sampleCards.fiveHearts,
          sampleCards.twoHearts,
        ]),
        createPlayer('player-3', 'Bob', 45, [
          sampleCards.jackClubs,
          sampleCards.eightDiamonds,
          sampleCards.fourDiamonds,
          sampleCards.threeClubs,
          sampleCards.twoDiamonds,
        ]),
        createPlayer('player-4', 'Charlie', 29, [
          sampleCards.aceSpades,
          sampleCards.kingHearts,
          sampleCards.queenDiamonds,
          sampleCards.jackClubs,
          sampleCards.twoClubs,
        ]),
      ],
      currentPlayerId: 'player-1',
      isMyTurn: false,
      canStart: true,
    }),
  },
}
