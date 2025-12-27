import { Container, Spinner } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { setGameId, usePlayerGame } from 'store'
import { Game } from 'views/Game'
import { Start } from 'views/Start'

const GameId = () => {
  const router = useRouter()
  const { gameId, playerId, playerSecret } = usePlayerGame()

  useEffect(() => {
    if (typeof router.query.id === 'string' && gameId !== router.query.id) {
      setGameId({ gameId: router.query.id })
    }
  }, [router.query.id, gameId])

  if (!gameId) {
    return (
      <Container centerContent marginTop="60">
        <Spinner size="xl" />
      </Container>
    )
  }

  if (!playerId || !playerSecret) {
    return <Start />
  }

  return <Game gameId={gameId} playerId={playerId} playerSecret={playerSecret} />
}

export default GameId
