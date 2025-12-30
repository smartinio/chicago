import { Box, Code, Container, Flex, LightMode, Spinner, Text } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { trpc } from '#utils/trpc'
import { Card, Errors, Snapshot, isError } from '#shared/types'
import { dataHandler } from '#utils/data'
import { Start } from '#views/Start'
import { useSnapshot, setSnapshot, useResults, setError, clearPlayerGame } from '#store'
import { MyHand } from '#views/MyHand'
import { TopControls } from '#views/TopControls'
import { Players } from '#views/Players'
import { MiddleArea } from '#views/MiddleArea'
import { ActionButtons } from '#views/ActionButtons'
import { memo, useEffect, useRef, useState } from 'react'
import { cards } from '#utils/card'
import { useDesktopScale } from '#utils/useDesktopScale'
import Image from 'next/image'

// Position of action buttons above the hand (in pixels from bottom)
export const ACTION_BUTTONS_BOTTOM = '140px'

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
  const [selectedCards, setSelectedCards] = useState<Card[]>([])

  // Calculate optimal zoom scale for desktop to fill vertical space
  const scale = useDesktopScale()

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

  const isPageVisibleRef = useRef(true)

  useEffect(() => {
    // Update on visibility change (tab switch)
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = document.visibilityState === 'visible'
    }

    // Also update on focus/blur (window switch)
    const handleFocus = () => {
      isPageVisibleRef.current = true
    }
    const handleBlur = () => {
      isPageVisibleRef.current = false
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  useEffect(() => {
    if (snapshot?.isMyTurn && !isPageVisibleRef.current) {
      const audio = new Audio('/audio/yourturn.ogg')

      audio.play().catch((error) => {
        console.error('Error playing audio', error)
      })
    }
  }, [snapshot?.isMyTurn])

  // Set body background to match game gradient for iOS Safari lip
  useEffect(() => {
    document.body.style.background = '#cbd5e0'
    return () => {
      document.body.style.background = ''
    }
  }, [])

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

  const { isMyTurn, roundPhase } = snapshot
  const canPlay = isMyTurn && ['tricking', 'throwing'].includes(roundPhase)

  return (
    <LightMode>
      {/* Outer wrapper that applies zoom scaling for desktop */}
      <Box
        position="fixed"
        top={0}
        left={0}
        width="100vw"
        height="100vh"
        overflow="hidden"
      >
        {/* Scaling wrapper - transform creates containing block for fixed descendants */}
        <Box
          width={`${100 / scale}vw`}
          height={`${100 / scale}vh`}
          transformOrigin="top left"
          transform={`scale(${scale})`}
        >
          <Flex
            bgGradient="linear(to-b, gray.200, gray.300)"
            h="100%"
            width="100%"
            color="gray.800"
            position="relative"
          >
            <PreloadedCards />
            <Container marginTop="20">
              <TopControls />
              <Players>
                <MiddleArea />
              </Players>
            </Container>
            {/* Action buttons positioned above the hand */}
            <Box
              position="absolute"
              bottom={ACTION_BUTTONS_BOTTOM}
              left={0}
              right={0}
              display="flex"
              justifyContent="center"
              zIndex={10}
              paddingX="4"
            >
              <ActionButtons
                selectedCards={selectedCards}
                setSelectedCards={setSelectedCards}
                canPlay={canPlay}
              />
            </Box>
          </Flex>
          <MyHand selectedCards={selectedCards} setSelectedCards={setSelectedCards} />
        </Box>
      </Box>
    </LightMode>
  )
}

const PreloadedCards = memo(function PreloadedCards() {
  return (
    <Box position="fixed" bottom={0} left={0} zIndex={-999} opacity={0}>
      {Object.entries(cards).map(([key, src]) => (
        <Image key={key} src={src} alt={key} width={100} height={140} priority />
      ))}
    </Box>
  )
})
