import { VStack, Input, Button, Text, FormControl, FormErrorMessage } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { Errors, isError } from 'shared/types'
import { trpc } from 'utils/trpc'
import { usePersistedState } from 'utils/usePersistedState'
import { setError, setPlayerGame, usePlayerGame, useResults } from 'store'
import { displayErrors } from 'utils/error'
import { useState } from 'react'
import { MAX_PLAYER_NAME_LENGTH, MIN_PLAYER_NAME_LENGTH } from 'shared/constants'

export const JoinGame = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [playerName, setPlayerName] = usePersistedState('playerName')
  const [playerNameError, setPlayerNameError] = useState('')
  const { gameId } = usePlayerGame()
  const { error } = useResults()

  const joinGameMutation = trpc.joinGame.useMutation({
    onError(error) {
      setLoading(false)
      displayErrors(error, {
        playerName: setPlayerNameError,
      })
    },
    onSuccess(data) {
      setLoading(false)

      if (isError(data)) {
        switch (data) {
          case Errors.NAME_ALREADY_TAKEN: {
            setPlayerNameError(`The name "${playerName}" is already taken!`)
            break
          }
          case Errors.TOO_MANY_PLAYERS: {
            alert('This game is already full!')
            break
          }
          default:
            setError(error)
        }
      } else {
        setPlayerGame(data)
        router.push(`/games/${data.gameId}`)
      }
    },
  })

  const joinGame = async () => {
    if (!gameId) return
    setLoading(true)
    joinGameMutation.mutate({
      playerName,
      gameId,
      password: undefined, // Skip passwords for now
    })
  }

  const handlePlayerNameChange = (e: any) => {
    setPlayerNameError('')
    setPlayerName(e.target.value)
  }

  return (
    <FormControl isInvalid={Boolean(playerNameError)}>
      <VStack align="start">
        <Text>Your name</Text>
        <Input
          type="text"
          value={playerName}
          onChange={handlePlayerNameChange}
          minLength={MIN_PLAYER_NAME_LENGTH}
          maxLength={MAX_PLAYER_NAME_LENGTH}
          isInvalid={Boolean(playerNameError)}
        ></Input>
        {playerNameError ? <FormErrorMessage>{playerNameError}</FormErrorMessage> : null}

        <Text>Invitation key</Text>
        <Input
          type="text"
          value={gameId || 'Ask your friend for an invite'}
          disabled
          isInvalid={false}
        ></Input>

        <Button onClick={joinGame} isLoading={loading} isDisabled={loading || !gameId}>
          Join game
        </Button>
      </VStack>
    </FormControl>
  )
}
