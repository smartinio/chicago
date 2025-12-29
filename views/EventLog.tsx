import { EventSnapshot, PlayerSnapshot } from '#game/snapshot'
import { Card } from '#game/types'
import { useSnapshot } from '#store'
import { Box, Text, VStack } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'

const suits: Record<string, string> = {
  spades: '♠️',
  hearts: '♥️',
  diamonds: '♦️',
  clubs: '♣️',
}

const vals: Record<number, string> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

const formatCard = (card: Card) => {
  return `${suits[card.suit]}${vals[card.value] || card.value}`
}

const handTypeNames: Record<string, string> = {
  highCard: 'High Card',
  pair: 'Pair',
  twoPair: 'Two Pair',
  threeOfAKind: 'Three of a Kind',
  straight: 'Straight',
  flush: 'Flush',
  fullHouse: 'Full House',
  fourOfAKind: 'Four of a Kind',
  straightFlush: 'Straight Flush',
  royalStraightFlush: 'Royal Straight Flush',
}

const formatEvent = (
  event: EventSnapshot,
  players: PlayerSnapshot[]
): { actor?: string; message: string } | null => {
  const actor =
    event.actorId === 'server'
      ? undefined
      : players.find((p) => p.id === event.actorId)?.name ?? 'Someone'

  const { data } = event

  switch (event.action) {
    case 'joined_team':
      return { actor, message: 'joined the game 👋' }
    case 'left_game':
      return { actor, message: 'left the game 🍃' }
    case 'kicked_player':
      return { actor: data.player?.name, message: 'was kicked 👞' }
    case 'played_card':
      return { actor, message: `played ${data.card ? formatCard(data.card) : 'a card'}` }
    case 'made_it_rain':
      return { actor, message: 'made it rain 💦 with ' + data.cards?.map(formatCard).join(', ') }
    case 'killed_round':
      return { message: '💀 Round killed' }
    case 'restarted_round':
      return { message: '🔄 Round restarted' }
    case 'started_round':
      return { message: '✨ New round ✨' }
    case 'threw_cards': {
      const count = data.count ?? 0
      const cards = count === 1 ? 'card' : 'cards'
      const icon = count === 0 ? '🤔' : '🔁'
      return { actor, message: `swapped ${count} ${cards} ${icon}` }
    }
    case 'tricking_phase_started':
      return { message: '🎲 Time to play!' }
    case 'throw_cycle_started':
      const swap: Record<number, string> = {
        1: 'First',
        2: 'Second',
        3: 'Third',
      }
      return { message: `— ${swap[data.throwNumber!]} swap —` }
    case 'won_trick':
      return { actor, message: 'took the trick! 👀' }
    case 'won_round': {
      const thing = data.points === 15 ? 'a successful Chicago' : 'winning the round'
      return { actor, message: `got ${data.points || '?'}p for ${thing}! 🙌` }
    }
    case 'lost_chicago':
      return { actor, message: `failed Chicago (-15p) 😢` }
    case 'had_hand_type': {
      const handName = handTypeNames[data.handType ?? ''] ?? data.handType
      return {
        actor,
        message: `had ${handName}: ${data.cards?.map(formatCard).join(', ')} 🃏`,
      }
    }
    case 'received_points': {
      const pts = data.points ?? 0
      const hand = data.handType ? handTypeNames[data.handType] ?? data.handType : 'hand'
      return { actor, message: `got ${pts}p for a ${hand} 💰` }
    }
    case 'won_game':
      return { actor, message: 'won the game! 👑👑👑' }
    case 'answered_chicago':
      return { actor, message: data.accepted ? 'called Chicago! 🚀' : 'passed on Chicago' }
    case 'answered_one_open':
      const card = formatCard(data.card!)
      return {
        actor,
        message: data.accepted ? `accepted open ${card} 👍` : `declined open ${card} 👎`,
      }
    case 'answered_four_of_a_kind': {
      if (data.answer === 'reset_others') {
        return { actor, message: 'reset others to zero 😈' }
      }
      return { actor, message: 'took the points 💰' }
    }
    default:
      return null
  }
}

export const EventLog = () => {
  const { snapshot } = useSnapshot()

  if (!snapshot) {
    return null
  }

  return <EventList events={snapshot.events} players={snapshot.players} />
}

const Event = ({ event, players }: { event: EventSnapshot; players: PlayerSnapshot[] }) => {
  const formatted = formatEvent(event, players)

  if (!formatted) {
    return null
  }

  return (
    <Text fontSize="xs" opacity={0.5}>
      {formatted.actor && (
        <Text as="span" fontWeight="bold">
          {formatted.actor}
        </Text>
      )}
      {formatted.actor && ' '}
      {formatted.message}
    </Text>
  )
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

const EventList = ({ events, players }: { events: EventSnapshot[]; players: PlayerSnapshot[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasMountedRef = useRef(false)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const target = container.scrollHeight - container.clientHeight

    if (!hasMountedRef.current) {
      container.scrollTop = target
      hasMountedRef.current = true
      return
    }

    const start = container.scrollTop
    const distance = target - start
    if (distance <= 0) return

    const duration = 500
    const startTime = performance.now()
    let rafId: number

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      container.scrollTop = start + distance * easeOutCubic(progress)
      if (progress < 1) rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [events])

  const hasOverflow = events.length > 3

  return (
    <Box
      ref={scrollRef}
      overflowY="auto"
      height="80px"
      position="relative"
      zIndex={0}
      css={{
        maskImage: hasOverflow ? 'linear-gradient(to bottom, transparent 0%, black 40%)' : 'none',
        WebkitMaskImage: hasOverflow
          ? 'linear-gradient(to bottom, transparent 0%, black 40%)'
          : 'none',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
      }}
    >
      <VStack justifyContent="center" minHeight="100%" gap={0}>
        {events.map((event) => (
          <Event key={event.id} event={event} players={players} />
        ))}
      </VStack>
    </Box>
  )
}
