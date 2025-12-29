import { Flex, Button } from '@chakra-ui/react'
import { usePlayerGame, useSnapshot } from '#store'
import { defaultDataHandler } from '#utils/data'
import { trpc } from '#utils/trpc'
import { PlayingCard } from '#views/PlayingCard'
import { EventLog } from '#views/EventLog'
import { Text } from '@chakra-ui/react'

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

  const { gamePhase, roundPhase, openCard, canStart, dealerId } = snapshot
  const dealer = snapshot?.players.find((p) => p.id === dealerId)?.name
  const openOffering = openCard ? <PlayingCard card={openCard} width="50px" /> : null
  const waitingFor = (() => {
    if (gamePhase === 'new' && snapshot?.players.length < 2) {
      return dealer && <Text>Waiting for players</Text>
    }

    if (gamePhase === 'new' && dealer) {
      return <Text>Waiting for {dealer} to start</Text>
    }
  })()

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
        openOffering || waitingFor || <EventLog />
      )}
    </Flex>
  )
}
