import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { Card, Errors, GamePhase, RoundPhase } from '#shared/types'
import { usePlayerGame, useSnapshot } from '#store'
import { dataHandler, defaultDataHandler } from '#utils/data'
import { trpc } from '#utils/trpc'
import { PlayingCard } from '#views/PlayingCard'

export const ActionButtons = ({
  selectedCards,
  setSelectedCards,
  canPlay,
}: {
  selectedCards: Card[]
  setSelectedCards: (cards: Card[] | ((cards: Card[]) => Card[])) => void
  canPlay: boolean
}) => {
  const { snapshot } = useSnapshot()
  const { gameId, playerSecret } = usePlayerGame()
  const mutationOptions = { onSuccess: defaultDataHandler }
  const mutationOptionsWithError = { onSuccess: dataHandler(() => {}, handleError) }

  const startNewRoundMutation = trpc.startNewRound.useMutation(mutationOptions)
  const answerChicagoMutation = trpc.answerChicago.useMutation(mutationOptions)
  const answerOneOpenMutation = trpc.answerOneOpen.useMutation(mutationOptions)
  const answerFourOfAKindMutation = trpc.answerFourOfAKind.useMutation(mutationOptions)
  const throwCardsMutation = trpc.throwCards.useMutation(mutationOptionsWithError)
  const playCardMutation = trpc.playCard.useMutation(mutationOptionsWithError)

  if (!snapshot) {
    return null
  }

  const {
    gamePhase,
    roundPhase,
    openCard,
    canStart,
    dealerId,
    currentPlayerId,
    isMyTurn,
    players,
    rules,
    oneOpenAvailable,
  } = snapshot

  const dealer = players.find((p) => p.id === dealerId)
  const currentPlayer = players.find((p) => p.id === currentPlayerId)

  // Find the four of a kind cards from the current player's played cards
  const getFourOfAKindCards = (): Card[] => {
    if (!currentPlayer) return []
    const cards = currentPlayer.playedCards
    const valueCounts = new Map<number, Card[]>()

    for (const card of cards) {
      const existing = valueCounts.get(card.value) || []
      valueCounts.set(card.value, [...existing, card])
    }

    for (const cards of Array.from(valueCounts.values())) {
      if (cards.length >= 4) {
        return cards.slice(0, 4)
      }
    }
    return []
  }

  const fourOfAKindCards = getFourOfAKindCards()
  const fourOfAKindPoints = rules.handPoints.fourOfAKind

  const playCard = (card = selectedCards[0]) => {
    if (card) {
      playCardMutation.mutate({ gameId, playerSecret, card })
    }
    setSelectedCards([])
  }

  const throwCards = ({ oneOpen = false }: { oneOpen?: boolean }) => {
    throwCardsMutation.mutate({ gameId, playerSecret, cards: selectedCards, oneOpen })
    setSelectedCards([])
  }

  const handlePlayPress = () => {
    playCard()
  }

  const handleThrowPress = () => {
    throwCards({ oneOpen: false })
  }

  const handleOneOpenPress = () => {
    throwCards({ oneOpen: true })
  }

  const getButtonStyle = (visible: boolean) => {
    return {
      transition: 'all 0.2s ease',
      opacity: visible ? 1 : 0,
      boxShadow: '0px 5px 15px rgba(0,0,0,0.2)',
    } as const
  }

  // Render start/restart/deal button
  if (canStart) {
    const buttonText = (() => {
      if (gamePhase === 'new') return 'Start game'
      if (gamePhase === 'over') return 'Restart game'
      if (roundPhase === 'killed') return 'Restart round'
      if (roundPhase === 'over') return 'Deal cards'
      return 'Start'
    })()

    return (
      <Box textAlign="center">
        <Button
          size="md"
          colorScheme="green"
          onClick={() => startNewRoundMutation.mutate({ gameId, dealerSecret: playerSecret })}
          borderRadius="full"
          boxShadow="0px 2px 20px rgba(0,0,0,0.2)"
        >
          {buttonText}
        </Button>
      </Box>
    )
  }

  // Render asking_chicago phase
  if (roundPhase === 'asking_chicago' && isMyTurn) {
    return (
      <HStack spacing="1" justify="center" align="center">
        <Button
          onClick={() => answerChicagoMutation.mutate({ gameId, playerSecret, takeChicago: true })}
          variant="solid"
          colorScheme="green"
          borderRadius="3xl"
          boxShadow="0px 2px 15px rgba(0,0,0,0.2)"
          size="md"
        >
          Yes
        </Button>
        <Text fontSize="xl" fontWeight="bold" px="4">
          Chicago?
        </Text>
        <Button
          onClick={() => answerChicagoMutation.mutate({ gameId, playerSecret, takeChicago: false })}
          variant="solid"
          colorScheme="red"
          borderRadius="3xl"
          boxShadow="0px 2px 15px rgba(0,0,0,0.2)"
          size="md"
        >
          No
        </Button>
      </HStack>
    )
  }

  // Render asking_one_open phase
  if (roundPhase === 'asking_one_open' && isMyTurn && openCard) {
    return (
      <HStack spacing="4" justify="center" align="end">
        <Button
          onClick={() => answerOneOpenMutation.mutate({ gameId, playerSecret, acceptOpen: true })}
          variant="solid"
          colorScheme="green"
          borderRadius="3xl"
          boxShadow="0px 2px 15px rgba(0,0,0,0.2)"
          size="md"
        >
          Accept
        </Button>
        <PlayingCard card={openCard} width="40px" />
        <Button
          onClick={() => answerOneOpenMutation.mutate({ gameId, playerSecret, acceptOpen: false })}
          variant="solid"
          colorScheme="red"
          borderRadius="3xl"
          boxShadow="0px 2px 15px rgba(0,0,0,0.2)"
          size="md"
        >
          Reject
        </Button>
      </HStack>
    )
  }

  // Render asking_four_of_a_kind phase
  if (roundPhase === 'asking_four_of_a_kind' && isMyTurn) {
    return (
      <HStack spacing="4" justify="center" align="center">
        <Button
          onClick={() =>
            answerFourOfAKindMutation.mutate({ gameId, playerSecret, answer: 'points' })
          }
          variant="solid"
          colorScheme="green"
          borderRadius="3xl"
          boxShadow="0px 2px 15px rgba(0,0,0,0.2)"
          size="md"
        >
          +{fourOfAKindPoints} points
        </Button>
        <Button
          onClick={() =>
            answerFourOfAKindMutation.mutate({ gameId, playerSecret, answer: 'reset_others' })
          }
          variant="solid"
          colorScheme="red"
          borderRadius="3xl"
          boxShadow="0px 2px 15px rgba(0,0,0,0.2)"
          size="md"
        >
          Zero others
        </Button>
      </HStack>
    )
  }

  // Render throwing phase (swap/pass buttons)
  if (roundPhase === 'throwing' && isMyTurn) {
    return (
      <HStack spacing="2" justifyContent="center">
        <Button
          style={getButtonStyle(true)}
          onClick={handleThrowPress}
          variant="solid"
          colorScheme={selectedCards.length > 0 ? 'green' : 'blue'}
          borderRadius="3xl"
          isDisabled={!canPlay}
        >
          {selectedCards.length > 0 ? `Swap ${selectedCards.length}` : 'Pass'}
        </Button>
        {oneOpenAvailable && selectedCards.length === 1 && (
          <Button
            style={getButtonStyle(true)}
            onClick={handleOneOpenPress}
            variant="solid"
            colorScheme={'blue'}
            borderRadius="3xl"
            isDisabled={!canPlay}
          >
            1 Open
          </Button>
        )}
      </HStack>
    )
  }

  // Render tricking phase (play button)
  if (roundPhase === 'tricking' && isMyTurn && selectedCards.length > 0) {
    return (
      <Box textAlign="center">
        <Button
          style={getButtonStyle(true)}
          onClick={handlePlayPress}
          variant="solid"
          colorScheme="green"
          borderRadius="3xl"
          isDisabled={!canPlay}
        >
          Play
        </Button>
      </Box>
    )
  }

  // No CTA to show
  return null
}

const handleError = (error?: Errors) => {
  switch (error) {
    case Errors.MUST_FOLLOW_SUIT: {
      alert('You must follow suit')
      break
    }
    case Errors.CARD_NOT_IN_HAND:
    case Errors.INVALID_PHASE:
    case Errors.FORBIDDEN: {
      alert('You are not allowed to do that right now')
      break
    }
    case Errors.TOO_FEW_PLAYERS: {
      alert('You need to be at least 2 players to play')
      break
    }
  }
}
