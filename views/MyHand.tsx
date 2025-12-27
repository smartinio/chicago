import {
  Box,
  Button,
  Flex,
  HStack,
  SlideFade,
  useDisclosure,
  useMediaQuery,
} from '@chakra-ui/react'
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
import { Card, Errors } from 'shared/types'
import { useSnapshot } from 'store'
import { dataHandler } from 'utils/data'
import { sortBySuitAndValue } from 'utils/sort'
import { trpc } from 'utils/trpc'
import { ChoosePartnerModal } from 'views/ChoosePartnerModal'
import { PlayingCard } from 'views/PlayingCard'

export const MyHand = () => {
  const { snapshot } = useSnapshot()
  const [selectedCard, setSelectedCard] = useState<Card>()
  const [pendingDropCard, setPendingDropCard] = useState<Card>()
  const [minHeight, setMinHeight] = useState(0)
  const [shouldFadeIn, setShouldFadeIn] = useState(false)
  const [maxHeight, setMaxHeight] = useState<number>()
  const ref = useRef<HTMLDivElement>(null)
  const modal = useDisclosure()

  const mutationOptions = { onSuccess: dataHandler(() => {}, handleError) }
  const playBindingTrickMutation = trpc.playBindingTrick.useMutation(mutationOptions)
  const playRegularTrickMutation = trpc.playCard.useMutation(mutationOptions)

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 1 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { distance: 1 } })
  const sensors = useSensors(touchSensor, mouseSensor)
  const [isMobile] = useMediaQuery('(max-width: 600px)')

  useEffect(() => {
    switch (snapshot?.roundPhase) {
      case 'bidding':
      case 'killed':
      case 'over':
        setSelectedCard(undefined)
    }
  }, [snapshot?.roundPhase])

  useEffect(() => {
    const clientHeight = ref.current?.clientHeight || 0
    if (clientHeight !== minHeight && snapshot?.roundPhase === 'bidding') {
      setMinHeight(clientHeight)
    }
  }, [minHeight, snapshot?.roundPhase])

  useEffect(() => {
    let timeout = setTimeout(() => {
      if (snapshot?.roundPhase === 'bidding') {
        setMaxHeight(minHeight)
      }
      setShouldFadeIn(true)
    }, 1000)

    return () => clearTimeout(timeout)
  }, [minHeight, snapshot?.roundPhase])

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

    if (selectedCard?.id !== cardId) {
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

  const getButtonStyle = (cardId: string) => {
    const transition = 'all 0.2s ease'

    if (selectedCard?.id !== cardId) {
      return {
        transition,
        opacity: 0,
      } as const
    }

    return {
      transition,
      opacity: snapshot?.isMyTurn ? 1 : 0.3,
      boxShadow: '0px 5px 15px rgba(0,0,0,0.2)',
      transform: 'translateY(-60px)',
    } as const
  }

  const handleCardClick = (card: Card) => {
    if (selectedCard?.id === card.id) {
      setSelectedCard(undefined)
    } else {
      setSelectedCard(card)
    }
  }

  const playBindingTrick = (bindingCard: Card) => {
    const startingCard = selectedCard

    if (bindingCard && startingCard) {
      playBindingTrickMutation.mutate({ gameId, playerSecret, bindingCard, startingCard })
    }
  }

  const playRegularTrick = (card = selectedCard) => {
    if (card) {
      playRegularTrickMutation.mutate({ gameId, playerSecret, card })
    }
  }

  const handlePlayPress = () => {
    if (!snapshot.trumpSuit) {
      modal.onOpen()
    } else {
      playRegularTrick()
    }
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setPendingDropCard(undefined)
    setSelectedCard(undefined)
    if (!e.over || !isMyTurn) {
      return
    } else if (!snapshot.trumpSuit) {
      modal.onOpen()
    } else {
      playRegularTrick(e.active.data.current as Card)
    }
  }

  const handleDragOver = (e: DragOverEvent) => {
    if (isMyTurn) {
      setSelectedCard(undefined)
      setPendingDropCard(e.over ? (e.active.data.current as Card) : undefined)
    }
  }

  const { isMyTurn, myCards, roundPhase } = snapshot
  const sortedCards = sortBySuitAndValue(myCards)
  const canPlay = isMyTurn && roundPhase === 'tricking'

  return (
    <DndContext onDragEnd={handleDragEnd} onDragOver={handleDragOver} sensors={sensors}>
      <Droppable id="dropzone" enabled={roundPhase === 'tricking'} />
      <Box minHeight={minHeight} maxHeight={maxHeight}>
        <Box position="fixed" bottom={0} left={0} right={0} ref={ref}>
          <SlideFade in={shouldFadeIn} offsetY="120px">
            <Box paddingX="5" marginBottom={isMobile ? '-14' : '-24'}>
              <HStack spacing="-20" opacity={canPlay ? 1 : 0.15}>
                {sortedCards.map((card, idx) => (
                  <Flex
                    key={card.id}
                    direction="column"
                    alignItems="center"
                    style={{ marginLeft: idx ? '-45px' : undefined }}
                  >
                    <Box paddingBottom="5">
                      <Button
                        style={getButtonStyle(card.id)}
                        onClick={handlePlayPress}
                        variant="solid"
                        colorScheme="green"
                        borderRadius="3xl"
                        isDisabled={!canPlay}
                        zIndex={card.id === selectedCard?.id ? undefined : -999}
                      >
                        Play
                      </Button>
                    </Box>
                    <Draggable id={card.id} card={card}>
                      <Box maxHeight={200}>
                        <PlayingCard
                          style={getCardStyle(card.id)}
                          onClick={() => handleCardClick(card)}
                          card={card}
                          trump={card.suit === snapshot.trumpSuit}
                        />
                      </Box>
                    </Draggable>
                  </Flex>
                ))}
              </HStack>
            </Box>
          </SlideFade>
        </Box>

        <ChoosePartnerModal
          selectedCard={selectedCard}
          onClose={modal.onClose}
          onChoose={playBindingTrick}
          isOpen={modal.isOpen}
        />
      </Box>
    </DndContext>
  )
}

const handleError = (error?: Errors) => {
  switch (error) {
    case Errors.BID_TOO_LOW: {
      alert('Your bid is too low!')
      break
    }
    case Errors.INVALID_PHASE:
    case Errors.FORBIDDEN: {
      alert('You are not allowed to do that right now')
      break
    }
    case Errors.TOO_FEW_PLAYERS: {
      alert('You need to be at least 4 players to play')
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

const Droppable = ({ id, enabled }: { id: string; enabled: boolean }) => {
  const { setNodeRef } = useDroppable({ id, disabled: !enabled })

  return (
    <Box
      zIndex={enabled ? undefined : -999}
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
