import { Box, Flex, SlideFade } from '@chakra-ui/react'
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

interface MyHandProps {
  selectedCards: Card[]
  setSelectedCards: (cards: Card[] | ((cards: Card[]) => Card[])) => void
}

export const MyHand = ({ selectedCards, setSelectedCards }: MyHandProps) => {
  const { snapshot } = useSnapshot()
  const [pendingDropCard, setPendingDropCard] = useState<Card>()
  const [minHeight, setMinHeight] = useState(0)
  const [shouldFadeIn, setShouldFadeIn] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const mutationOptions = { onSuccess: dataHandler(() => {}, handleError) }
  const playCardMutation = trpc.playCard.useMutation(mutationOptions)

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 1 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { distance: 1 },
  })
  const sensors = useSensors(touchSensor, mouseSensor)

  useEffect(() => {
    switch (snapshot?.roundPhase) {
      case 'asking_chicago':
      case 'killed':
      case 'over':
        setSelectedCards([])
    }
  }, [snapshot?.roundPhase, setSelectedCards])

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

  const handleCardClick = (card: Card) => {
    setSelectedCards((cards) => {
      if (snapshot.roundPhase === 'tricking') {
        if (cards.some((c) => c.id === card.id)) {
          return []
        }
        return [card]
      }

      if (!['killed', 'over'].includes(roundPhase)) {
        if (cards.some((c) => c.id === card.id)) {
          return cards.filter((c) => c.id !== card.id)
        }
        return [...cards, card]
      }

      return cards
    })
  }

  const playCard = (card: Card) => {
    playCardMutation.mutate({ gameId, playerSecret, card })
    setSelectedCards([])
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setPendingDropCard(undefined)
    if (e.over && isMyTurn) {
      playCard(e.active.data.current as Card)
    }
  }

  const handleDragOver = (e: DragOverEvent) => {
    if (isMyTurn && e.over) {
      setSelectedCards([])
      setPendingDropCard(e.active.data.current as Card)
    } else {
      setPendingDropCard(undefined)
    }
  }

  const { isMyTurn, myCards, roundPhase, gamePhase } = snapshot
  const sortedCards = sortBySuitAndValue(myCards)
  const canPlay = isMyTurn && ['tricking', 'throwing'].includes(roundPhase)

  // Fixed overlap - cards will naturally center with flex
  // Cards are 120px wide, overlap of 60px means each card adds 60px to total width
  const overlapMargin = 60

  return (
    <DndContext onDragEnd={handleDragEnd} onDragOver={handleDragOver} sensors={sensors}>
      <Droppable id="dropzone" />
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
      pointerEvents="none"
    />
  )
}
