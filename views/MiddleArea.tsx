import { Text, Flex, Button } from '@chakra-ui/react'
import { usePlayerGame, useSnapshot } from '#store'
import { defaultDataHandler } from '#utils/data'
import { trpc } from '#utils/trpc'
import { PlayingCard } from '#views/PlayingCard'
import { Card, Suit, Value } from '#game/types'
import { EventLog } from '#views/EventLog'

const suits: Record<Suit, string> = {
  clubs: '♣️',
  spades: '♠️',
  hearts: '♥️',
  diamonds: '♦',
} as const

const values: Partial<Record<Value, string>> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
} as const

const formatCard = (card: Card) => {
  return `${suits[card.suit]}${values[card.value] || card.value}`
}

export const MiddleArea = () => {
  const { snapshot } = useSnapshot()
  const { gameId, playerSecret } = usePlayerGame()
  const mutationOptions = { onSuccess: defaultDataHandler }
  const startNewRoundMutation = trpc.startNewRound.useMutation(mutationOptions)

  if (!snapshot) {
    return null
  }

  const startNewRound = () => {
    startNewRoundMutation.mutate({ gameId, dealerSecret: playerSecret })
  }

  const { gamePhase, roundPhase, openCard, canStart } = snapshot
  const openOffering = openCard ? <PlayingCard card={openCard} width="50px" /> : null

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
      ) : (
        openOffering || <EventLog />
      )}
    </Flex>
  )
}
