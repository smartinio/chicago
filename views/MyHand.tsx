import { Box, Button, Flex, HStack, SlideFade, VStack } from '@chakra-ui/react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useRef, useState } from 'react'
import { Card, Errors } from '#shared/types'
import { useSnapshot } from '#store'
import { dataHandler } from '#utils/data'
import { sortBySuitAndValue } from '#utils/sort'
import { trpc } from '#utils/trpc'
import { PlayingCard } from '#views/PlayingCard'

export const MyHand = () => {
  const { snapshot } = useSnapshot()
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const [pendingDropCard, setPendingDropCard] = useState<Card>()
  const [minHeight, setMinHeight] = useState(0)
  const [shouldFadeIn, setShouldFadeIn] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const mutationOptions = { onSuccess: dataHandler(() => {}, handleError) }
  const throwCardsMutation = trpc.throwCards.useMutation(mutationOptions)
  const playCardMutation = trpc.playCard.useMutation(mutationOptions)
  const answerChicagoMutation = trpc.answerChicago.useMutation(mutationOptions)
  const answerOneOpenMutation = trpc.answerOneOpen.useMutation(mutationOptions)
  const answerFourOfAKindMutation = trpc.answerFourOfAKind.useMutation(mutationOptions)

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 1 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { distance: 1 } })
  const sensors = useSensors(touchSensor, mouseSensor)

  useEffect(() => {
    switch (snapshot?.roundPhase) {
      case 'asking_chicago':
      case 'killed':
      case 'over':
        setSelectedCards([])
    }
  }, [snapshot?.roundPhase])

  useEffect(() => {
    const clientHeight = ref.current?.clientHeight || 0
    if (clientHeight !== minHeight && snapshot?.roundPhase === 'throwing') {
      setMinHeight(clientHeight)
    }
  }, [minHeight, snapshot?.roundPhase])

  useEffect(() => {
    let timeout = setTimeout(() => {
      setShouldFadeIn(true)
    }, 1000)

    return () => clearTimeout(timeout)
  }, [])

  if (!snapshot) {
    return null
  }

  const { gameId, playerSecret } = snapshot

  const getCardStyle = (cardId: string) => {
    const transition = 'all 0.3s ease'
    const userSelect = 'none' as const

    if (pendingDropCard) {
      const pending = pendingDropCard.id === cardId
      return {
        userSelect,
        transition,
        transform: pending ? undefined : 'translateY(100px)',
      }
    }

    if (!selectedCards.some((c) => c.id === cardId)) {
      return {
        transition,
        userSelect,
      }
    }

    return {
      transition,
      userSelect,
      boxShadow: '0px 5px 15px rgba(0,0,0,0.2)',
      transform: 'translateY(-60px)',
    }
  }

  const getPlayButtonStyle = () => {
    const opacity = (() => {
      if (!snapshot?.isMyTurn) {
        return 0
      }

      if (selectedCards.length > 0) {
        return 1
      }

      return 0
    })()

    return {
      transition: 'all 0.2s ease',
      opacity,
      boxShadow: '0px 5px 15px rgba(0,0,0,0.2)',
      transform: 'translateY(-60px)',
    } as const
  }

  const getThrowButtonStyle = () => {
    return {
      transition: 'all 0.2s ease',
      opacity: snapshot?.isMyTurn ? 1 : 0,
      boxShadow: '0px 5px 15px rgba(0,0,0,0.2)',
      transform: 'translateY(-60px)',
    } as const
  }

  const handleCardClick = (card: Card) => {
    setSelectedCards((cards) => {
      if (snapshot.roundPhase === 'tricking') {
        if (cards.some((c) => c.id === card.id)) {
          return []
        }
        return [card]
      }

      if (snapshot.roundPhase === 'throwing') {
        if (cards.some((c) => c.id === card.id)) {
          return cards.filter((c) => c.id !== card.id)
        }
        return [...cards, card]
      }

      return cards
    })
  }

  useEffect(() => {
    console.log(snapshot)
  }, [snapshot])

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

  const handleAcceptOneOpenPress = () => {
    answerOneOpenMutation.mutate({ gameId, playerSecret, acceptOpen: true })
  }

  const handleRejectOneOpenPress = () => {
    answerOneOpenMutation.mutate({ gameId, playerSecret, acceptOpen: false })
  }

  const handleAcceptChicagoPress = () => {
    answerChicagoMutation.mutate({ gameId, playerSecret, takeChicago: true })
  }

  const handleRejectChicagoPress = () => {
    answerChicagoMutation.mutate({ gameId, playerSecret, takeChicago: false })
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setPendingDropCard(undefined)
    setSelectedCards([])
    if (e.over && isMyTurn) {
      playCard(e.active.data.current as Card)
    }
  }

  const handleDragOver = (e: DragOverEvent) => {
    if (isMyTurn) {
      setSelectedCards([])
      setPendingDropCard(e.over ? (e.active.data.current as Card) : undefined)
    }
  }

  const handleFourOfAKindPointsPress = () => {
    answerFourOfAKindMutation.mutate({ gameId, playerSecret, answer: 'points' })
  }

  const handleFourOfAKindZeroOthersPress = () => {
    answerFourOfAKindMutation.mutate({ gameId, playerSecret, answer: 'reset_others' })
  }

  const { isMyTurn, myCards, roundPhase, gamePhase, oneOpenAvailable, rules } = snapshot
  const sortedCards = sortBySuitAndValue(myCards)
  const canPlay = isMyTurn && ['tricking', 'throwing'].includes(roundPhase)

  // Fixed overlap - cards will naturally center with flex
  // Cards are 120px wide, overlap of 60px means each card adds 60px to total width
  const overlapMargin = 60

  return (
    <DndContext onDragEnd={handleDragEnd} onDragOver={handleDragOver} sensors={sensors}>
      {gamePhase === 'round' && roundPhase === 'tricking' && <Droppable id="dropzone" />}
      <Box minHeight={minHeight}>
        <Box
          position="fixed"
          bottom={0}
          left={0}
          right={0}
          display="flex"
          flexDirection="column"
          alignItems="center"
          paddingBottom="env(safe-area-inset-bottom)"
          ref={ref}
        >
          <SlideFade in={shouldFadeIn} offsetY="120px">
            <Box paddingX="4">
              <Box paddingBottom="4" textAlign="center" opacity={gamePhase === 'round' ? 1 : 0}>
                {(() => {
                  switch (roundPhase) {
                    case 'throwing':
                      return (
                        <HStack spacing="2" justifyContent="center">
                          <Button
                            style={getThrowButtonStyle()}
                            onClick={handleThrowPress}
                            variant="solid"
                            colorScheme={selectedCards.length > 0 ? 'green' : 'blue'}
                            borderRadius="3xl"
                            isDisabled={!canPlay}
                          >
                            {selectedCards.length > 0 ? `Throw ${selectedCards.length}` : 'Pass'}
                          </Button>
                          {oneOpenAvailable && selectedCards.length === 1 && (
                            <Button
                              style={getThrowButtonStyle()}
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
                    case 'tricking':
                      return (
                        <Button
                          style={getPlayButtonStyle()}
                          onClick={handlePlayPress}
                          variant="solid"
                          colorScheme="green"
                          borderRadius="3xl"
                          isDisabled={!canPlay}
                        >
                          Play
                        </Button>
                      )
                    case 'asking_chicago':
                      return (
                        isMyTurn && (
                          <VStack spacing="2" justifyContent="center">
                            <strong>Chicago?</strong>
                            <HStack spacing="2" justifyContent="center">
                              <Button
                                onClick={handleAcceptChicagoPress}
                                variant="solid"
                                colorScheme="green"
                                borderRadius="3xl"
                                boxShadow="0px 5px 15px rgba(0,0,0,0.2)"
                              >
                                Yes
                              </Button>
                              <Button
                                onClick={handleRejectChicagoPress}
                                variant="solid"
                                colorScheme="red"
                                borderRadius="3xl"
                                boxShadow="0px 5px 15px rgba(0,0,0,0.2)"
                              >
                                No
                              </Button>
                            </HStack>
                          </VStack>
                        )
                      )
                    case 'asking_four_of_a_kind':
                      return (
                        isMyTurn && (
                          <HStack spacing="2" justifyContent="center">
                            <Button
                              onClick={handleFourOfAKindPointsPress}
                              variant="solid"
                              colorScheme="green"
                              borderRadius="3xl"
                            >
                              {rules.handPoints.fourOfAKind} points
                            </Button>
                            <Button
                              onClick={handleFourOfAKindZeroOthersPress}
                              variant="solid"
                              colorScheme="red"
                              borderRadius="3xl"
                            >
                              Zero others
                            </Button>
                          </HStack>
                        )
                      )
                    case 'asking_one_open':
                      return (
                        isMyTurn && (
                          <HStack spacing="2" justifyContent="center">
                            <Button
                              onClick={handleAcceptOneOpenPress}
                              variant="solid"
                              colorScheme="green"
                              borderRadius="3xl"
                            >
                              Accept
                            </Button>
                            <Button
                              onClick={handleRejectOneOpenPress}
                              variant="solid"
                              colorScheme="red"
                              borderRadius="3xl"
                            >
                              Reject
                            </Button>
                          </HStack>
                        )
                      )
                    default:
                      return null
                  }
                })()}
              </Box>
              <Flex justifyContent="center" opacity={canPlay ? 1 : 0.15} marginBottom="-110px">
                {sortedCards.map((card, idx) => (
                  <Box
                    key={card.id}
                    zIndex={idx}
                    marginLeft={idx > 0 ? `-${overlapMargin}px` : undefined}
                    transition="margin 0.2s ease"
                  >
                    <Draggable id={card.id} card={card}>
                      <PlayingCard
                        style={getCardStyle(card.id)}
                        onClick={() => handleCardClick(card)}
                        card={card}
                      />
                    </Draggable>
                  </Box>
                ))}
              </Flex>
            </Box>
          </SlideFade>
        </Box>
      </Box>
    </DndContext>
  )
}

const handleError = (error?: Errors) => {
  switch (error) {
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

const Draggable = ({
  id,
  card,
  children,
}: {
  id: string
  card: Card
  children: React.ReactNode
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id, data: card })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </button>
  )
}

const Droppable = ({ id }: { id: string }) => {
  const { setNodeRef } = useDroppable({ id })

  return (
    <Box
      ref={setNodeRef}
      id={id}
      position="absolute"
      width="100%"
      height="70%"
      bottom={200}
      left={0}
      right={0}
    />
  )
}
