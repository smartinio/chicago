import { Box, Code, Container, Flex, Spinner, Text } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { trpc } from 'utils/trpc'
import { Errors, Snapshot, isError } from 'shared/types'
import { dataHandler, defaultDataHandler } from 'utils/data'
import { Start } from 'views/Start'
import { useSnapshot, setSnapshot, useResults, setError, clearPlayerGame } from 'store'
import { MyHand } from 'views/MyHand'
import { TopControls } from 'views/TopControls'
import { Players } from 'views/Players'
import { MiddleArea } from 'views/MiddleArea'
import { memo, useEffect, useRef } from 'react'
import { cards } from 'utils/card'
import Image from 'next/legacy/image'

interface Props {
  gameId: string
  playerId: string
  playerSecret: string
}

export const Game = ({ gameId, playerId, playerSecret }: Props) => {
  const router = useRouter()
  const { error } = useResults()
  const { snapshot } = useSnapshot()
  const keepAlive = useRef(false)

  // Start every render by assuming failure
  // Will set to true further down
  keepAlive.current = false

  const handleSnapshot = dataHandler((data: Snapshot | 'KICKED') => {
    if (data === 'KICKED') {
      clearPlayerGame()
      router.push('/').then(() => alert('You were kicked from the game'))
    } else {
      setSnapshot(data)
    }
  }, setError)

  trpc.snapshotSubscription.useSubscription(
    { playerId, playerSecret, gameId },
    {
      onError: (error) => {
        console.error('Subscription error', error)
      },
      onData: handleSnapshot,
    }
  )

  const snapshotQuery = trpc.snapshotQuery.useQuery(
    { playerId, playerSecret, gameId },
    { enabled: false }
  )

  useEffect(() => {
    const listener = async () => {
      if (document.visibilityState === 'visible') {
        console.log('fetching snapshot manually')
        const foo = await snapshotQuery.refetch()
        foo.data && handleSnapshot(foo.data)
      }
    }

    document.addEventListener('visibilitychange', listener)

    return () => document.removeEventListener('visibilitychange', listener)
  })

  const keepAliveQuery = trpc.keepAlive.useQuery({ gameId, playerSecret })

  useEffect(() => {
    if (isError(keepAliveQuery.data) && error !== keepAliveQuery.data) {
      setError(keepAliveQuery.data)
    }

    let httpInterval = setInterval(() => {
      if (keepAlive.current) {
        fetch('/api/keepalive') // keeps heroku happy on http
      }
      // ping once every 5 minutes
    }, 5 * 60 * 1000)

    let socketInterval = setInterval(() => {
      if (keepAlive.current) {
        keepAliveQuery.refetch() // keeps heroku happy on websocket
      }
    }, 15 * 1000)

    return () => {
      clearInterval(httpInterval)
      clearInterval(socketInterval)
    }
  }, [keepAliveQuery, error])

  if (!snapshot && error === Errors.FORBIDDEN) {
    return <Start />
  }

  if (!snapshot && !error) {
    return (
      <Container centerContent marginTop="60">
        <Spinner size="xl" />
      </Container>
    )
  }

  if (!snapshot) {
    return (
      <Container marginTop="20">
        <Text>Oh no Error:</Text>
        <Code colorScheme="red">{JSON.stringify({ error }, null, 2)}</Code>
      </Container>
    )
  }

  // Only keep active games alive
  keepAlive.current = true

  return (
    <Flex bgGradient="linear(to-b, gray.200, gray.300)" h="100vh" position="fixed" width="100%">
      <PreloadedCards />
      <Container marginTop="20">
        <TopControls />
        <Players>
          <MiddleArea />
        </Players>
        <MyHand />
      </Container>
    </Flex>
  )
}

const PreloadedCards = memo(function PreloadedCards() {
  return (
    <Box position="fixed" bottom={0} left={0} zIndex={-999} opacity={0}>
      {Object.entries(cards).map(([key, card]) => (
        <Image key={key} src={card} alt={key} priority />
      ))}
    </Box>
  )
})
