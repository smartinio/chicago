import { Flex, Button, Text, HStack } from '@chakra-ui/react'
import { PlayingCard } from '#views/PlayingCard'
import { EventLog } from '#views/EventLog'
import { Card, GamePhase, RoundPhase } from '#shared/types'

export type MiddleAreaContentProps = {
  gamePhase: GamePhase
  roundPhase: RoundPhase
  isMyTurn: boolean
  canStart: boolean
  dealerName?: string
  currentPlayerName?: string
  openCard?: Card
  fourOfAKindCards: Card[]
  fourOfAKindPoints: number
  playerCount: number
  onStartNewRound?: () => void
  onAcceptChicago?: () => void
  onRejectChicago?: () => void
  onAcceptOneOpen?: () => void
  onRejectOneOpen?: () => void
  onFourOfAKindPoints?: () => void
  onFourOfAKindZeroOthers?: () => void
}

export const MiddleAreaContent = ({
  gamePhase,
  roundPhase,
  isMyTurn,
  canStart,
  dealerName,
  currentPlayerName,
  openCard,
  fourOfAKindCards,
  fourOfAKindPoints,
  playerCount,
  onStartNewRound,
  onAcceptChicago,
  onRejectChicago,
  onAcceptOneOpen,
  onRejectOneOpen,
  onFourOfAKindPoints,
  onFourOfAKindZeroOthers,
}: MiddleAreaContentProps) => {
  // Waiting messages for game setup
  const waitingFor = (() => {
    if (gamePhase === 'new' && playerCount < 2) {
      return (
        dealerName && (
          <Text fontSize="sm" opacity={0.7}>
            Waiting for players...
          </Text>
        )
      )
    }
    if (gamePhase === 'new' && dealerName) {
      return (
        <Text fontSize="sm" opacity={0.7}>
          Waiting for {dealerName} to start...
        </Text>
      )
    }
  })()

  // Render asking phases
  const renderAskingPhase = () => {
    switch (roundPhase) {
      case 'asking_chicago':
        if (isMyTurn) {
          return (
            <HStack spacing="4" justify="center" align="center">
              <Button
                onClick={onAcceptChicago}
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
                onClick={onRejectChicago}
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
        } else {
          return (
            <Text fontSize="sm" opacity={0.7}>
              {currentPlayerName} is deciding on Chicago... 🚀
            </Text>
          )
        }

      case 'asking_one_open':
        if (isMyTurn && openCard) {
          return (
            <HStack spacing="4" justify="center" align="center">
              <Button
                onClick={onAcceptOneOpen}
                variant="solid"
                colorScheme="green"
                borderRadius="3xl"
                boxShadow="0px 2px 15px rgba(0,0,0,0.2)"
                size="md"
              >
                Accept
              </Button>
              <PlayingCard card={openCard} width="50px" />
              <Button
                onClick={onRejectOneOpen}
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
        } else if (openCard) {
          return (
            <HStack spacing="2" justify="center" align="center">
              <Text
                fontSize="sm"
                opacity={0.7}
                display="inline-flex"
                justifyContent="center"
                alignItems="center"
                gap="2"
              >
                Open offer <PlayingCard card={openCard} width="50px" /> for {currentPlayerName}
              </Text>
            </HStack>
          )
        }
        return null

      case 'asking_four_of_a_kind':
        if (isMyTurn) {
          return (
            <HStack spacing="4" justify="center" align="center">
              <Button
                onClick={onFourOfAKindPoints}
                variant="solid"
                colorScheme="green"
                borderRadius="3xl"
                boxShadow="0px 2px 15px rgba(0,0,0,0.2)"
                size="md"
              >
                +{fourOfAKindPoints} points
              </Button>
              <HStack spacing="1">
                {fourOfAKindCards.map((card) => (
                  <PlayingCard key={card.id} card={card} width="45px" />
                ))}
              </HStack>
              <Button
                onClick={onFourOfAKindZeroOthers}
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
        } else {
          return (
            <Text fontSize="sm" opacity={0.7}>
              {currentPlayerName} has four of a kind... 😬
            </Text>
          )
        }

      default:
        return null
    }
  }

  const askingContent = renderAskingPhase()

  // Show open card offering when in throwing phase (not asking_one_open)
  const openOffering =
    openCard && roundPhase !== 'asking_one_open' ? (
      <PlayingCard card={openCard} width="50px" />
    ) : null

  return (
    <Flex direction="row" justify="center" align="center" height="100px">
      {canStart ? (
        <Button
          size="md"
          colorScheme="green"
          onClick={onStartNewRound}
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
      ) : askingContent ? (
        askingContent
      ) : (
        openOffering || waitingFor || <EventLog />
      )}
    </Flex>
  )
}
