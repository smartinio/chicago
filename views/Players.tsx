import {
  Avatar,
  VStack,
  Text,
  Heading,
  Tag,
  Box,
  TagProps,
  Flex,
  Spinner,
  Button,
  SlideFade,
} from '@chakra-ui/react'
import confetti from 'canvas-confetti'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, PlayerSnapshot } from 'shared/types'
import { useSnapshot } from 'store'
import { defaultDataHandler } from 'utils/data'
import { trpc } from 'utils/trpc'
import { PlayingCard } from 'views/PlayingCard'

const AvatarBadge = (props: TagProps) => {
  return (
    <Box position="absolute" top={0} right={0} overflow="visible">
      <Tag size="lg" borderRadius="full" {...props} boxShadow="0px 0px 5px rgba(0,0,0,0.25)" />
    </Box>
  )
}

const PlayerRow = ({ children }: any) => {
  return (
    <Flex direction="row" justify="space-between" gap={2}>
      {children}
    </Flex>
  )
}

const placeholderCard: Card = {
  id: 'spades:14',
  suit: 'spades',
  value: 14,
}

export const Players = ({ children }: { children: React.ReactNode }) => {
  const { snapshot } = useSnapshot()
  const [localPlayers, setLocalPlayers] = useState<PlayerSnapshot[]>([])
  const isCollecting = useRef(false)
  const [collected, setCollected] = useState(false)

  useEffect(() => {
    if (snapshot?.roundPhase === 'collecting') {
      isCollecting.current = true
    } else if (isCollecting.current) {
      setCollected(true)
    }
  }, [snapshot?.roundPhase])

  useEffect(() => {
    const didCollect = isCollecting.current && snapshot?.roundPhase !== 'collecting'

    let timeout = setTimeout(
      () => {
        if (snapshot?.players) {
          if (didCollect) {
            isCollecting.current = false
            setCollected(false)
          }
          setLocalPlayers(snapshot.players)
        }
      },
      didCollect ? 500 : 0
    )

    return () => clearTimeout(timeout)
  }, [snapshot])

  const [p1, p2, p3, p4] = localPlayers
  const sortedPlayers = [p1, p2, p4, p3].filter(Boolean) // hack to get a clocwise cycle in the UI
  const p1p2 = sortedPlayers.slice(0, 2)
  const p3p4 = sortedPlayers.slice(2, 4)

  const renderPlayer = (player: PlayerSnapshot, i: number) => (
    <Player
      key={player.id}
      collected={collected}
      sortedPlayers={sortedPlayers}
      player={player}
      index={i}
    />
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
  collected: boolean
  sortedPlayers: PlayerSnapshot[]
  player: PlayerSnapshot
  index: number
}) => {
  const { collected, sortedPlayers, player, index: i } = props
  const { snapshot } = useSnapshot()
  const mutationOptions = { onSuccess: defaultDataHandler }
  const kickPlayerMutation = trpc.kickPlayer.useMutation(mutationOptions)
  const avatarRef = useRef<HTMLDivElement>(null)
  const isThisPlayerCollecting =
    snapshot?.roundPhase === 'collecting' && snapshot.currentPlayerId === player.id
  const isGameWinner = snapshot?.gamePhase === 'over' && player.score >= 52

  const celebratePlayer = useCallback((offset = 0) => {
    const position = avatarRef.current?.getBoundingClientRect()
    if (position) {
      const { clientWidth, clientHeight } = document.documentElement
      const x = (position.x + 35 + offset) / clientWidth
      const y = (position.y + 110 + offset) / clientHeight
      confetti({ origin: { x, y }, startVelocity: 20, ticks: 75 })
    }
  }, [])

  useEffect(() => {
    if (isThisPlayerCollecting) {
      celebratePlayer()
    }
  }, [celebratePlayer, isThisPlayerCollecting])

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
    highestBid,
    playerId,
    playerSecret,
    currentPlayerId,
    startingCard,
    gamePhase,
    gameId,
    ownerId,
    dealerId,
  } = snapshot

  const isLeft = i % 2 === 0
  const flexDirection = isLeft ? 'row' : 'row-reverse'
  const isHighest = highestBid?.playerId === player.id
  const isInTeam = player.isInTeam || isHighest
  const isMe = player.id === playerId
  const imOwner = playerId === ownerId

  const isCurrentPlayer =
    gamePhase === 'round' &&
    !['over', 'killed'].includes(roundPhase) &&
    player.id === currentPlayerId

  const isCurrentDealer =
    gamePhase === 'round' && ['over', 'killed'].includes(roundPhase) && player.id === dealerId

  const shouldShowSpinner = isCurrentDealer || isCurrentPlayer
  const isStartingCard = startingCard && player.playedCard?.id === startingCard.id
  const pulseCard = isStartingCard && roundPhase === 'tricking'
  const hasHighestScore =
    player.score && sortedPlayers.every((opponent) => opponent.score <= player.score)

  const cardSlideFadeProps = collected
    ? getSlideFadePropsForPlayer({ player, sortedPlayers, currentPlayerId })
    : { offsetX: isLeft ? '-10px' : '10px', offsetY: '-10px', in: true }

  const kickPlayer = (player: PlayerSnapshot) => {
    const shouldKick = confirm(`Are you sure you want to kick ${player.name}?`)

    if (shouldKick) {
      kickPlayerMutation.mutate({ gameId, ownerSecret: playerSecret, playerIdToKick: player.id })
    }
  }

  return (
    <Flex gap="2" align="flex-start" flexDirection={flexDirection} flex={1}>
      <VStack spacing="2" align="center">
        <Box position="relative">
          <Box borderRadius="full" backgroundColor="lightyellow">
            <Avatar
              ref={avatarRef}
              borderColor={isInTeam ? 'black' : 'gray.500'}
              borderWidth={isInTeam ? 'thick' : 'medium'}
              size="lg"
              src={`https://api.dicebear.com/7.x/miniavs/svg?seed=${player.id}&flip=${!isLeft}`}
            />
          </Box>
          {roundPhase === 'bidding' && player.folded ? (
            <AvatarBadge colorScheme="gray" as="del">
              {player.bid || 0}
            </AvatarBadge>
          ) : null}
          {roundPhase === 'bidding' && !player.folded && player.bid ? (
            <AvatarBadge background={isHighest ? 'yellow' : 'gray.400'} color="black">
              {player.bid}
            </AvatarBadge>
          ) : null}
          {roundPhase !== 'bidding' && isInTeam ? (
            <AvatarBadge background="black" color="white">
              {player.tricks}
              <Text opacity={0.5}>/{highestBid?.numTricks}</Text>
            </AvatarBadge>
          ) : null}
          {roundPhase !== 'bidding' && !isInTeam && player.tricks ? (
            <AvatarBadge colorScheme="linkedin">{player.tricks}</AvatarBadge>
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
        </Box>

        <Flex alignItems="center" direction="column" gap={1}>
          <Heading size="sm" maxWidth={100} textAlign="center">
            {player.name}
          </Heading>
        </Flex>

        <VStack spacing="2">
          <Tag
            size="sm"
            colorScheme={hasHighestScore ? 'blackAlpha' : undefined}
            background={hasHighestScore ? 'black' : undefined}
            color={hasHighestScore ? 'white' : undefined}
          >
            {player.score} pts
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

      <Box maxWidth="150px" position="relative" backgroundColor="blackAlpha.100" borderRadius="md">
        {player.playedCard ? (
          <SlideFade {...cardSlideFadeProps}>
            <PlayingCard card={player.playedCard} pulse={pulseCard} />
          </SlideFade>
        ) : (
          <PlayingCard card={placeholderCard} opacity={0} />
        )}
      </Box>
    </Flex>
  )
}

const getSlideFadePropsForPlayer = (props: {
  player: PlayerSnapshot
  sortedPlayers: PlayerSnapshot[]
  currentPlayerId: string
}) => {
  const { sortedPlayers, player, currentPlayerId } = props

  const playerIndex = sortedPlayers.findIndex((p) => p.id === player.id)
  const collectorIndex = sortedPlayers.findIndex((p) => p.id === currentPlayerId)
  const collectorIsLeft = collectorIndex % 2 === 0
  const collectorIsTop = collectorIndex <= 1

  if (playerIndex === collectorIndex) {
    const offsetX = collectorIsLeft ? '-10px' : '10px'
    const offsetY = '-10px'

    return {
      offsetX,
      offsetY,
      in: false,
    }
  }

  const playerIsTop = playerIndex <= 1
  const isSameCol = playerIndex % 2 === collectorIndex % 2
  const isSameRow = (playerIsTop && collectorIsTop) || (!collectorIsTop && !playerIsTop)

  const delta = 100
  const offsetX = isSameCol ? undefined : collectorIsLeft ? `-${delta}px` : `${delta}px`
  const offsetY = isSameRow ? undefined : collectorIsTop ? `-${delta}px` : `${delta}px`

  return {
    offsetX,
    offsetY,
    in: false,
  }
}
