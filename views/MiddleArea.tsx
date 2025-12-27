import { Text, Flex, Button, ThemeTypings } from '@chakra-ui/react'
import { Suit } from 'shared/types'
import { usePlayerGame, useSnapshot } from 'store'
import { defaultDataHandler } from 'utils/data'
import { trpc } from 'utils/trpc'
import { BiddingButtons } from 'views/BiddingButtons'

const suits = {
  clubs: '♣',
  diamonds: '♦',
  spades: '♠',
  hearts: '♥',
} as const

const RED = 'red.500'
const BLACK = 'blackAlpha.800'

const trumpColor: Record<Suit, ThemeTypings['colors']> = {
  clubs: BLACK,
  spades: BLACK,
  diamonds: RED,
  hearts: RED,
} as const

export const MiddleArea = () => {
  const { snapshot } = useSnapshot()
  const { gameId, playerSecret } = usePlayerGame()
  const mutationOptions = { onSuccess: defaultDataHandler }
  const collectTrickMutation = trpc.collectTrick.useMutation(mutationOptions)
  const startNewRoundMutation = trpc.startNewRound.useMutation(mutationOptions)

  if (!snapshot) {
    return null
  }

  const startNewRound = () => {
    startNewRoundMutation.mutate({ gameId, dealerSecret: playerSecret })
  }

  const collectTrick = () => {
    collectTrickMutation.mutate({ gameId, playerSecret })
  }

  const { gamePhase, roundPhase, isMyTurn, trumpSuit, canStart } = snapshot
  const canCollect = gamePhase === 'round' && roundPhase === 'collecting' && isMyTurn
  const isBidding = gamePhase === 'round' && roundPhase === 'bidding'

  return (
    <Flex direction="row" justify="center" align="center" height="100px">
      {canStart ? (
        <Button
          size="md"
          colorScheme="green"
          onClick={startNewRound}
          isDisabled={!canStart}
          borderRadius="full"
          boxShadow="0px 2px 20px rgba(0,0,0,0.2)"
        >
          {(() => {
            if (gamePhase === 'new') return 'Start game'
            if (gamePhase === 'over') return 'Restart game'
            if (roundPhase === 'killed') return 'Restart round'
            if (roundPhase === 'over') return 'Deal cards'
          })()}
        </Button>
      ) : isBidding ? (
        <BiddingButtons />
      ) : canCollect ? (
        <Button
          size="md"
          colorScheme="green"
          onClick={collectTrick}
          boxShadow="0px 2px 20px rgba(0,0,0,0.2)"
          borderRadius="full"
        >
          Collect
        </Button>
      ) : (
        <Text color={trumpSuit && trumpColor[trumpSuit]} fontSize="3xl" opacity={trumpSuit ? 1 : 0}>
          {trumpSuit ? suits[trumpSuit] : suits['spades']}
        </Text>
      )}
    </Flex>
  )
}
