import { VStack, Button, Input, Text, FormErrorMessage, FormControl } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import {
  MAX_GAME_NAME_LENGTH,
  MAX_PLAYER_NAME_LENGTH,
  MIN_GAME_NAME_LENGTH,
  MIN_PLAYER_NAME_LENGTH,
} from 'shared/constants'
import { setError, setPlayerGame } from 'store'
import { trpc } from 'utils/trpc'
import { usePersistedState } from 'utils/usePersistedState'
import { useTextInput } from 'utils/useTextInput'
import { displayErrors } from 'utils/error'

export const CreateGame = () => {
  const router = useRouter()

  const [gameName, setGameName] = usePersistedState('gameName')
  const [playerName, setPlayerName] = usePersistedState('playerName')
  const [gameNameError, setGameNameError] = useState()
  const [playerNameError, setPlayerNameError] = useState()
  const [loading, setLoading] = useState(false)

  const handlePlayerNameChange = useTextInput(setPlayerName, setPlayerNameError)
  const handleGameNameChange = useTextInput(setGameName, setGameNameError)

  const newGameMutation = trpc.createNewGame.useMutation({
    onError(error) {
      setLoading(false)
      displayErrors(error, {
        gameName: setGameNameError,
        playerName: setPlayerNameError,
      })
    },
    onSuccess(data) {
      setLoading(false)
      setPlayerGame(data)
      router.push(`/games/${data.gameId}`)
    },
  })

  const createNewGame = () => {
    setLoading(true)
    newGameMutation.mutate({
      password: undefined, // Skip passwords for now
      gameName,
      playerName,
    })
  }

  return (
    <FormControl isInvalid={gameNameError || playerNameError}>
      <VStack align="start">
        <Text>Your name</Text>
        <Input
          type="text"
          value={playerName}
          onChange={handlePlayerNameChange}
          minLength={MIN_PLAYER_NAME_LENGTH}
          maxLength={MAX_PLAYER_NAME_LENGTH}
          isInvalid={Boolean(playerNameError)}
          errorBorderColor="red.300"
        ></Input>
        {playerNameError ? <FormErrorMessage>{playerNameError}</FormErrorMessage> : null}

        <Text>Lobby name</Text>
        <Input
          type="text"
          value={gameName}
          onChange={handleGameNameChange}
          minLength={MIN_GAME_NAME_LENGTH}
          maxLength={MAX_GAME_NAME_LENGTH}
          isInvalid={Boolean(gameNameError)}
          errorBorderColor="red.300"
        ></Input>
        {gameNameError ? <FormErrorMessage>{gameNameError}</FormErrorMessage> : null}

        <Button onClick={createNewGame} isLoading={loading} isDisabled={loading}>
          Create game
        </Button>
      </VStack>
    </FormControl>
  )
}
