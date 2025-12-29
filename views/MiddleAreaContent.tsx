import { Flex, Text, HStack } from '@chakra-ui/react'
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
  playerCount: number
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
  playerCount,
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

  // Render non-CTA phase info (when it's not our turn)
  const renderPhaseInfo = () => {
    switch (roundPhase) {
      case 'asking_chicago':
        if (!isMyTurn) {
          return (
            <Text fontSize="sm" opacity={0.7}>
              {currentPlayerName} is deciding on Chicago... 🚀
            </Text>
          )
        }
        return null

      case 'asking_one_open':
        if (!isMyTurn && openCard) {
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
        if (!isMyTurn) {
          return (
            <HStack spacing="2" justify="center" align="center">
              <Text fontSize="sm" opacity={0.7}>
                {currentPlayerName} has four of a kind... 😬
              </Text>
            </HStack>
          )
        }
        return null

      default:
        return null
    }
  }

  const phaseInfo = renderPhaseInfo()

  // Show open card offering when in throwing phase (not asking_one_open)
  const openOffering =
    openCard && roundPhase !== 'asking_one_open' ? (
      <PlayingCard card={openCard} width="50px" />
    ) : null

  // Don't show waiting message if canStart (the CTA is shown in ActionButtons)
  const showWaiting = !canStart && waitingFor

  return (
    <Flex direction="row" justify="center" align="center" height="100px">
      {phaseInfo ? phaseInfo : openOffering || showWaiting || <EventLog />}
    </Flex>
  )
}
