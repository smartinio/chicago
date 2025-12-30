import { Avatar, VStack, Text, Tag, Box, Flex, Spinner, Button, SlideFade } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import confetti from 'canvas-confetti'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, PlayerSnapshot } from '#shared/types'
import { useSnapshot } from '#store'
import { defaultDataHandler } from '#utils/data'
import { trpc } from '#utils/trpc'
import { PlayingCard } from '#views/PlayingCard'

const intensify = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  10% { transform: translate(-2px, -1px) rotate(-2deg) scale(1.02); }
  20% { transform: translate(2px, 1px) rotate(2deg) scale(1.01); }
  30% { transform: translate(-1px, 2px) rotate(-1deg) scale(1.03); }
  40% { transform: translate(1px, -2px) rotate(1deg) scale(1.01); }
  50% { transform: translate(-2px, 1px) rotate(-2deg) scale(1.02); }
  60% { transform: translate(2px, -1px) rotate(2deg) scale(1.01); }
  70% { transform: translate(-1px, -2px) rotate(-1deg) scale(1.02); }
  80% { transform: translate(1px, 2px) rotate(1deg) scale(1.03); }
  90% { transform: translate(-2px, -1px) rotate(-2deg) scale(1.01); }
`

const zoomInOut = keyframes`
  0% { transform: scale(0); opacity: 0; }
  10% { transform: scale(1); opacity: 1; }
  90% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0); opacity: 0; }
`

const PlayerRow = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex direction="row" justify="space-between" gap={2}>
      {children}
    </Flex>
  )
}

export const Players = ({ children }: { children: React.ReactNode }) => {
  const { snapshot } = useSnapshot()

  const [p1, p2, p3, p4] = snapshot?.players || []
  const sortedPlayers = [p1, p2, p4, p3].filter(Boolean) // hack to get a clocwise cycle in the UI
  const p1p2 = sortedPlayers.slice(0, 2)
  const p3p4 = sortedPlayers.slice(2, 4)

  return (
    <Flex direction="column">
      <PlayerRow>
        {p1p2.map((player, i) => (
          <Player key={player.id} sortedPlayers={sortedPlayers} player={player} index={i} />
        ))}
      </PlayerRow>
      {children}
      <PlayerRow>
        {p3p4.map((player, i) => (
          <Player key={player.id} sortedPlayers={sortedPlayers} player={player} index={i + 2} />
        ))}
      </PlayerRow>
    </Flex>
  )
}

const Player = (props: {
  sortedPlayers: PlayerSnapshot[]
  player: PlayerSnapshot
  index: number
}) => {
  const { sortedPlayers, player, index: i } = props
  const { snapshot } = useSnapshot()
  const mutationOptions = { onSuccess: defaultDataHandler }
  const kickPlayerMutation = trpc.kickPlayer.useMutation(mutationOptions)
  const avatarRef = useRef<HTMLDivElement>(null)
  const [floatingPoints, setFloatingPoints] = useState<number | null>(null)
  const isGameWinner = snapshot?.gamePhase === 'over' && player.score >= 52

  const celebratePlayer = useCallback((cb: (x: number, y: number) => void, offset = 0) => {
    const position = avatarRef.current?.getBoundingClientRect()
    if (position) {
      const { clientWidth, clientHeight } = document.documentElement
      const x = (position.x + 35 + offset) / clientWidth
      const y = (position.y + 110 + offset) / clientHeight
      cb(x, y)
    }
  }, [])

  useEffect(() => {
    if (player.id === snapshot?.roundWinnerId) {
      celebratePlayer(celebrate)
    }
  }, [player.id, snapshot?.roundWinnerId])

  const lastScoreEventIdForPlayer = snapshot?.events.findLast(
    (event) =>
      event.actorId === player.id &&
      ['received_points', 'won_round', 'lost_chicago'].includes(event.action)
  )?.id

  useEffect(() => {
    if (!snapshot?.events || !lastScoreEventIdForPlayer) return

    const lastIndex = snapshot.events.findIndex((e) => e.id === lastScoreEventIdForPlayer)
    const lastEvent = snapshot.events[lastIndex]
    if (!lastEvent?.data.points) return

    let totalPoints = lastEvent.data.points

    // If received_points is preceded by won_round for the same player, sum them
    if (lastEvent.action === 'received_points') {
      const prevEvent = snapshot.events[lastIndex - 1]
      if (
        prevEvent?.actorId === player.id &&
        prevEvent.action === 'won_round' &&
        prevEvent.data.points
      ) {
        totalPoints += prevEvent.data.points
      }
    }

    setFloatingPoints(totalPoints)
    const timeout = setTimeout(() => setFloatingPoints(null), 2500)
    return () => clearTimeout(timeout)
  }, [player.id, lastScoreEventIdForPlayer])

  useEffect(() => {
    if (!isGameWinner) return
    const offset = Math.ceil(Math.random() * 30) - 15
    const interval = setInterval(() => celebratePlayer(celebrate, offset), 1500)
    return () => clearInterval(interval)
  }, [celebratePlayer, isGameWinner])

  if (!snapshot) {
    return null
  }

  const {
    roundPhase,
    playerId,
    playerSecret,
    currentPlayerId,
    startingCard,
    gamePhase,
    gameId,
    ownerId,
    dealerId,
    rules,
    chicagoCallerId,
  } = snapshot

  const isChicagoCaller = player.id === chicagoCallerId && roundPhase === 'tricking'

  const isLeft = i % 2 === 0
  const flexDirection = isLeft ? 'row' : 'row-reverse'
  const isMe = player.id === playerId
  const imOwner = playerId === ownerId

  const isCurrentPlayer =
    gamePhase === 'round' &&
    !['over', 'killed'].includes(roundPhase) &&
    player.id === currentPlayerId

  const isCurrentDealer =
    gamePhase === 'round' && ['over', 'killed'].includes(roundPhase) && player.id === dealerId

  const isDealer = player.id === dealerId

  const shouldShowSpinner = isCurrentDealer || isCurrentPlayer
  const latestPlayedCard = player.playedCards.at(-1)
  const pulseCard =
    roundPhase === 'tricking' && startingCard && latestPlayedCard?.id === startingCard.id
  const hasHighestScore =
    player.score && sortedPlayers.every((opponent) => opponent.score <= player.score)

  const cardSlideFadeProps = getSlideFadePropsForPlayer({ player, sortedPlayers, currentPlayerId })

  const kickPlayer = (player: PlayerSnapshot) => {
    const shouldKick = confirm(`Are you sure you want to kick ${player.name}?`)

    if (shouldKick) {
      kickPlayerMutation.mutate({ gameId, ownerSecret: playerSecret, playerIdToKick: player.id })
    }
  }

  return (
    <Flex gap="2" align="stretch" flexDirection={flexDirection} flex={1}>
      <VStack spacing="1" align="center" flexShrink={0}>
        <Box position="relative">
          <Box borderRadius="full" backgroundColor="lightyellow">
            <Avatar
              ref={avatarRef}
              borderColor={isChicagoCaller ? 'orange.500' : 'gray.500'}
              borderWidth={'medium'}
              size="md"
              src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${player.name}&flip=${!isLeft}`}
              opacity={isChicagoCaller ? 0.4 : 1}
            />
          </Box>
          {isChicagoCaller ? (
            <Box
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              zIndex={10}
            >
              <Box
                fontSize="42px"
                animation={`${intensify} 0.15s infinite`}
                filter="drop-shadow(0 0 12px rgba(255, 100, 0, 0.9)) drop-shadow(0 0 25px rgba(255, 100, 0, 0.6))"
              >
                🚀
              </Box>
            </Box>
          ) : null}
          {imOwner && !isMe ? (
            <Box position="absolute" bottom={0} left={0}>
              <Button
                size="xs"
                colorScheme="red"
                onClick={() => kickPlayer(player)}
                borderRadius="full"
                minWidth="18px"
                height="18px"
                padding="0"
                fontSize="10px"
              >
                X
              </Button>
            </Box>
          ) : null}
          {isDealer ? (
            <Box position="absolute" bottom={0} right={0}>
              <Tag
                size="xs"
                colorScheme="green"
                borderRadius="full"
                boxShadow="0px 0px 5px rgba(0,0,0,0.25)"
                minWidth="20px"
                minHeight="20px"
                justifyContent="center"
              >
                D
              </Tag>
            </Box>
          ) : null}
        </Box>

        <Flex alignItems="center" direction="column" gap={1}>
          <Text width="72px" textAlign="center" fontSize="sm" fontWeight="bold">
            {player.name}
          </Text>
        </Flex>

        <VStack spacing="2" alignItems="center">
          <Tag
            size="sm"
            colorScheme={hasHighestScore ? 'blackAlpha' : undefined}
            background={hasHighestScore ? 'black' : undefined}
            color={hasHighestScore ? 'white' : undefined}
          >
            {player.score}p{player.takenChicago ? ' 🚀' : ''}
          </Tag>
          {isGameWinner ? (
            <Tag size="sm" background="green.500" color="white">
              WON
            </Tag>
          ) : null}
          {floatingPoints !== null ? (
            <Flex justify="center" width="100%">
              <Tag
                size="sm"
                background={floatingPoints < 0 ? 'red.500' : 'green.500'}
                color="white"
                animation={`${zoomInOut} 2.5s ease-out forwards`}
              >
                {floatingPoints > 0 ? '+' : ''}
                {floatingPoints}
              </Tag>
            </Flex>
          ) : isMe && !isGameWinner ? (
            <Text fontSize="small">(You)</Text>
          ) : shouldShowSpinner && !isMe ? (
            <Spinner size="sm" speed="1s" color="black" thickness="2px" emptyColor="gray.200" />
          ) : null}
        </VStack>
      </VStack>

      <Box
        width="min(110px, 24vw)"
        aspectRatio="167/243"
        flexShrink={0}
        alignSelf={i >= 2 ? 'flex-end' : 'flex-start'}
        position="relative"
        backgroundColor={player.playedCards.length === 0 ? 'blackAlpha.100' : 'transparent'}
        borderRadius="md"
        overflow="visible"
      >
        {player.playedCards.length > 0 ? (
          <Box position="absolute" inset={0}>
            <Box position="relative" width="100%" height="100%">
              {(() => {
                const cardCount = player.playedCards.length
                // Dynamic offset: more generous for fewer cards, tighter for more
                // 2 cards: 14px, 3 cards: 12px, 4 cards: 10px, 5 cards: 8px
                const offsetPx = Math.max(8, 18 - cardCount * 2)
                // Total offset space needed for all cards except the last
                const totalOffset = (cardCount - 1) * offsetPx
                // Card width = container width - total offset, so last card fits
                const cardWidth = `calc(min(110px, 24vw) - ${totalOffset}px)`

                // Vertical offset scaled by aspect ratio (243/167)
                const offsetYPx = offsetPx * (243 / 167)

                // Direction based on player position - stacks point toward center
                // i=0: top-left → down-right (+X, +Y)
                // i=1: top-right → down-left (-X, +Y)
                // i=2: bottom-left → up-right (+X, -Y)
                // i=3: bottom-right → up-left (-X, -Y)
                const xDir = i === 1 || i === 3 ? -1 : 1
                const yDir = i === 2 || i === 3 ? -1 : 1

                // For reversed directions, calculate position from the end
                const totalOffsetX = totalOffset
                const totalOffsetY = totalOffset * (243 / 167)

                return player.playedCards.map((card, cardIndex) => {
                  const isLatest = cardIndex === player.playedCards.length - 1
                  const isPulse = isLatest && pulseCard

                  // For normal direction: first card at 0, last at totalOffset
                  // For reversed direction: first card at totalOffset, last at 0
                  const baseOffsetX = cardIndex * offsetPx
                  const baseOffsetY = cardIndex * offsetYPx

                  const left = xDir === 1 ? baseOffsetX : totalOffsetX - baseOffsetX
                  const top = yDir === 1 ? baseOffsetY : totalOffsetY - baseOffsetY

                  return (
                    <SlideFade key={card.id} {...cardSlideFadeProps}>
                      <Box
                        position="absolute"
                        top={`${top}px`}
                        left={`${left}px`}
                        zIndex={cardIndex}
                        filter={isLatest ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' : undefined}
                      >
                        <PlayingCard card={card} pulse={isPulse} width={cardWidth} />
                      </Box>
                    </SlideFade>
                  )
                })
              })()}
            </Box>
          </Box>
        ) : null}
      </Box>
    </Flex>
  )
}

const getSlideFadePropsForPlayer = (props: {
  player: PlayerSnapshot
  sortedPlayers: PlayerSnapshot[]
  currentPlayerId: string
}) => {
  const { sortedPlayers, player } = props

  const playerIndex = sortedPlayers.findIndex((p) => p.id === player.id)
  const isLeft = playerIndex % 2 === 0

  // Card should slide in from the avatar's direction
  // Left players have avatar on the left, so card comes from left (negative offset)
  // Right players have avatar on the right, so card comes from right (positive offset)
  const offsetX = isLeft ? '-50px' : '50px'

  return {
    offsetX,
    in: true,
  }
}

const shootStars = (x: number, y: number) => {
  const defaults: confetti.Options = {
    spread: 360,
    ticks: 30,
    gravity: 0,
    decay: 0.85,
    startVelocity: 20,
    colors: ['FFE400', 'FFBD00', 'E89400', 'FFCA6C', 'FDFFB8'],
    origin: { x, y },
  }

  const shoot = () => {
    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2 / 2,
      shapes: ['star'],
    })

    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75 / 2,
      shapes: ['circle'],
    })
  }

  setTimeout(shoot, 0)
  setTimeout(shoot, 100)
  setTimeout(shoot, 200)
}

const celebrate = (x: number, y: number) => {
  const count = 200
  const defaults = {
    origin: { x, y },
  }

  const fire = (particleRatio: number, opts: confetti.Options) => {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
      spread: (opts.spread ?? 1) * 0.5,
      scalar: (opts.scalar ?? 1) * 0.6,
      ticks: 105,
    })
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  })
  fire(0.2, {
    spread: 60,
  })
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  })
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  })
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  })
}
