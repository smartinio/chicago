import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ChakraProvider, Flex } from '@chakra-ui/react'
import { MiddleAreaContent } from '../views/MiddleAreaContent'
import { Card } from '../shared/types'

// Sample cards for stories
const aceOfSpades: Card = { id: 'spades:14', suit: 'spades', value: 14 }
const kingOfHearts: Card = { id: 'hearts:13', suit: 'hearts', value: 13 }
const fourTwos: Card[] = [
  { id: 'hearts:2', suit: 'hearts', value: 2 },
  { id: 'diamonds:2', suit: 'diamonds', value: 2 },
  { id: 'spades:2', suit: 'spades', value: 2 },
  { id: 'clubs:2', suit: 'clubs', value: 2 },
]

const meta: Meta<typeof MiddleAreaContent> = {
  title: 'Game/MiddleAreaContent',
  component: MiddleAreaContent,
  decorators: [
    (Story) => (
      <ChakraProvider>
        <Flex
          bgGradient="linear(to-b, gray.200, gray.300)"
          minHeight="200px"
          width="100%"
          padding="6"
          justify="center"
          align="center"
        >
          <Story />
        </Flex>
      </ChakraProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MiddleAreaContent>

// ==================== CHICAGO STORIES ====================

export const ChicagoObserver: Story = {
  name: 'Chicago - Observing',
  args: {
    gamePhase: 'round',
    roundPhase: 'asking_chicago',
    isMyTurn: false,
    canStart: false,
    currentPlayerName: 'Harvey S',
    dealerName: 'Alice',
    fourOfAKindCards: [],
    playerCount: 3,
  },
}

// ==================== ONE OPEN STORIES ====================

export const OneOpenObserver: Story = {
  name: 'One Open - Observing',
  args: {
    gamePhase: 'round',
    roundPhase: 'asking_one_open',
    isMyTurn: false,
    canStart: false,
    currentPlayerName: 'Harvey S',
    dealerName: 'Alice',
    openCard: kingOfHearts,
    fourOfAKindCards: [],
    playerCount: 3,
  },
}

// ==================== FOUR OF A KIND STORIES ====================

export const FourOfAKindObserver: Story = {
  name: 'Four of a Kind - Observing',
  args: {
    gamePhase: 'round',
    roundPhase: 'asking_four_of_a_kind',
    isMyTurn: false,
    canStart: false,
    currentPlayerName: 'Harvey S',
    dealerName: 'Alice',
    fourOfAKindCards: fourTwos,
    playerCount: 3,
  },
}

// ==================== WAITING STATES ====================

export const WaitingForPlayers: Story = {
  name: 'Waiting for Players',
  args: {
    gamePhase: 'new',
    roundPhase: 'over',
    isMyTurn: false,
    canStart: false,
    dealerName: 'Alice',
    fourOfAKindCards: [],
    playerCount: 1,
  },
}

export const WaitingForDealer: Story = {
  name: 'Waiting for Dealer to Start',
  args: {
    gamePhase: 'new',
    roundPhase: 'over',
    isMyTurn: false,
    canStart: false,
    dealerName: 'Alice',
    fourOfAKindCards: [],
    playerCount: 3,
  },
}

// ==================== EVENT LOG ====================

export const EventLogView: Story = {
  name: 'Event Log (Default)',
  args: {
    gamePhase: 'round',
    roundPhase: 'tricking',
    isMyTurn: false,
    canStart: false,
    dealerName: 'Alice',
    fourOfAKindCards: [],
    playerCount: 3,
  },
}
