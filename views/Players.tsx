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

  const renderPlayer = (player: PlayerSnapshot, i: number) => (
    <Player key={player.id} sortedPlayers={sortedPlayers} player={player} index={i} />
  )

  return (
    <Flex direction="column">
      <PlayerRow>{p1p2.map(renderPlayer)}</PlayerRow>
      {children}
      <PlayerRow>{p3p4.map(renderPlayer)}</PlayerRow>
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
  const isGameWinner = snapshot?.gamePhase === 'over' && player.score >= 52

  const celebratePlayer = useCallback((offset = 0) => {
    const position = avatarRef.current?.getBoundingClientRect()
    if (position) {
      const { clientWidth, clientHeight } = document.documentElement
      const x = (position.x + 35 + offset) / clientWidth
      const y = (position.y + 110 + offset) / clientHeight
      confetti({
        origin: { x, y },
        ticks: 75,
        scalar: 0.5,
        gravity: 0.8,
        startVelocity: 22,
        decay: 0.9,
      })
    }
  }, [])

  useEffect(() => {
    if (player.id === snapshot?.roundWinnerId) {
      celebratePlayer()
    }
  }, [player.id, snapshot?.roundWinnerId])

  useEffect(() => {
    if (!isGameWinner) return
    const offset = Math.ceil(Math.random() * 30) - 15
    const interval = setInterval(() => celebratePlayer(offset), 1500)
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
  const isStartingCard = startingCard && latestPlayedCard?.id === startingCard.id
  const pulseCard = isStartingCard && roundPhase === 'tricking'
  const hasHighestScore =
    player.score && sortedPlayers.every((opponent) => opponent.score <= player.score)

  const cardSlideFadeProps = getSlideFadePropsForPlayer({ player, sortedPlayers, currentPlayerId })
  const playedCardOpacity = player.playedCards.length === snapshot?.trickCount ? 1 : 0.3

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

        <VStack spacing="2">
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
          {isMe && !isGameWinner ? <Text fontSize="small">(You)</Text> : null}
          {shouldShowSpinner && !isMe ? (
            <Spinner size="sm" speed="1s" color="black" thickness="2px" emptyColor="gray.200" />
          ) : null}
        </VStack>
      </VStack>

      <Box
        width="min(110px, 24vw)"
        aspectRatio="167/243"
        flexShrink={0}
        alignSelf="flex-start"
        position="relative"
        backgroundColor="blackAlpha.100"
        borderRadius="md"
        overflow="visible"
      >
        {latestPlayedCard ? (
          <Box
            position="absolute"
            inset={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <SlideFade {...cardSlideFadeProps}>
              <PlayingCard
                card={latestPlayedCard}
                pulse={pulseCard}
                opacity={playedCardOpacity}
                width="100%"
              />
            </SlideFade>
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
