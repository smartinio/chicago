import {
  VStack,
  Button,
  Input,
  Text,
  FormErrorMessage,
  FormControl,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Select,
  HStack,
  FormLabel,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { MAX_PLAYER_NAME_LENGTH, MIN_PLAYER_NAME_LENGTH } from '#shared/constants'
import { GameRules } from '#shared/types'
import { setPlayerGame } from '#store'
import { trpc } from '#utils/trpc'
import { usePersistedState, usePersistedObjectState } from '#utils/usePersistedState'
import { useTextInput } from '#utils/useTextInput'
import { displayErrors } from '#utils/error'

type GameRulesInput = Omit<GameRules, 'handPoints'>

const defaultRules: GameRulesInput = {
  throwScoreThreshold: 45,
  pointsForWin: 2,
  pointsForWinWithTwo: 5,
  numberOfThrows: 3,
  chicagoRequiresBestHand: true,
  chicagoCanBeCalledBeforeFifteen: true,
  oneOpenMode: 'last',
}

export const CreateGame = () => {
  const router = useRouter()

  const [playerName, setPlayerName] = usePersistedState('playerName')
  const [playerNameError, setPlayerNameError] = useState()
  const [loading, setLoading] = useState(false)
  const [rules, setRules] = usePersistedObjectState<GameRulesInput>('gameRules', defaultRules)

  const handlePlayerNameChange = useTextInput(setPlayerName, setPlayerNameError)

  const updateRule = <K extends keyof GameRulesInput>(key: K, value: GameRulesInput[K]) => {
    setRules((prev) => ({ ...prev, [key]: value }))
  }

  const newGameMutation = trpc.createNewGame.useMutation({
    onError(error) {
      setLoading(false)
      displayErrors(error, {
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
      gameName: 'Chicago',
      playerName,
      rules,
    })
  }

  return (
    <FormControl isInvalid={Boolean(playerNameError)}>
      <VStack align="start" spacing={4}>
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

        <Accordion allowToggle width="100%">
          <AccordionItem border="none">
            <AccordionButton px={0}>
              <Box flex="1" textAlign="left">
                <Text fontWeight="medium">Game Rules</Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4} px={0}>
              <VStack align="start" spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm">No more swaps after</FormLabel>
                  <NumberInput
                    size="sm"
                    value={rules.throwScoreThreshold}
                    onChange={(_, val) => updateRule('throwScoreThreshold', val || 45)}
                    min={42}
                    max={46}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Points for winning a trick</FormLabel>
                  <NumberInput
                    size="sm"
                    value={rules.pointsForWin}
                    onChange={(_, val) => updateRule('pointsForWin', val || 2)}
                    min={2}
                    max={5}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Points for winning with a 2</FormLabel>
                  <NumberInput
                    size="sm"
                    value={rules.pointsForWinWithTwo}
                    onChange={(_, val) => updateRule('pointsForWinWithTwo', val || 5)}
                    min={5}
                    max={10}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Number of swaps</FormLabel>
                  <NumberInput
                    size="sm"
                    value={rules.numberOfThrows}
                    onChange={(_, val) => updateRule('numberOfThrows', val || 3)}
                    min={2}
                    max={3}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <HStack justify="space-between">
                    <FormLabel fontSize="sm" mb={0}>
                      Chicago requires best hand
                    </FormLabel>
                    <Switch
                      isChecked={rules.chicagoRequiresBestHand}
                      onChange={(e) => updateRule('chicagoRequiresBestHand', e.target.checked)}
                    />
                  </HStack>
                </FormControl>

                <FormControl>
                  <HStack justify="space-between">
                    <FormLabel fontSize="sm" mb={0}>
                      Chicago can be called before 15 points
                    </FormLabel>
                    <Switch
                      isChecked={rules.chicagoCanBeCalledBeforeFifteen}
                      onChange={(e) =>
                        updateRule('chicagoCanBeCalledBeforeFifteen', e.target.checked)
                      }
                    />
                  </HStack>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">One open mode</FormLabel>
                  <Select
                    size="sm"
                    value={rules.oneOpenMode}
                    onChange={(e) => updateRule('oneOpenMode', e.target.value as 'all' | 'last')}
                  >
                    <option value="last">Last round only</option>
                    <option value="all">All rounds</option>
                  </Select>
                </FormControl>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>

        <Button onClick={createNewGame} isLoading={loading} isDisabled={loading}>
          Create game
        </Button>
      </VStack>
    </FormControl>
  )
}
