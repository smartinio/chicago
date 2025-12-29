import {
  Box,
  Container,
  Flex,
  HStack,
  Heading,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  Text,
} from '@chakra-ui/react'
import { useState } from 'react'
import { clearPlayerGame, setError, useSnapshot } from '#store'
import { dataHandler } from '#utils/data'
import { trpc } from '#utils/trpc'
import { useRouter } from 'next/router'
import { GameRules } from '#shared/types'

const formatRules = (rules: GameRules) => {
  const numSwaps = rules.numberOfThrows
  return [
    `${numSwaps} ${numSwaps === 1 ? 'swap' : 'swaps'}`,
    `Chicago ${
      rules.chicagoCanBeCalledBeforeFifteen ? 'can be called' : 'cannot be called'
    } before 15p`,
    `Chicago ${rules.chicagoRequiresBestHand ? 'requires' : 'does not require'} best hand`,
    `1 open card available at ${rules.oneOpenMode === 'last' ? 'the final swap' : 'every swap'}`,
    `Swapping is banned at ${rules.throwScoreThreshold}p`,
    `Winning a round gives ${rules.pointsForWin}p`,
    `Closing with a Two gives ${rules.pointsForWinWithTwo}p`,
  ]
}

export const TopControls = () => {
  const router = useRouter()
  const { snapshot } = useSnapshot()
  const [copiedLink, setCopiedLink] = useState(false)

  const leaveGameMutation = trpc.leaveGame.useMutation({
    onSuccess: dataHandler(() => {
      clearPlayerGame()
      router.push('/')
    }, setError),
  })

  if (!snapshot) {
    return null
  }

  const { gameId, playerSecret, gamePhase, name } = snapshot

  const leaveGame = () => {
    const shouldLeave = confirm('Are you sure you want to leave?')

    if (shouldLeave) {
      leaveGameMutation.mutate({ gameId, playerSecret })
    }
  }

  const copyInvitationLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
  }

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      backgroundColor="black"
      zIndex={1000}
      paddingTop="env(safe-area-inset-top)"
    >
      <Container paddingY={2}>
        <Flex justifyContent="space-between">
          <HStack spacing="2">
            <Heading size="md" color="lightgoldenrodyellow">
              {name}
            </Heading>
          </HStack>
          <HStack spacing="2">
            {gamePhase === 'new' ? (
              <Button
                size="xs"
                colorScheme="cyan"
                onMouseOut={() => setCopiedLink(false)}
                onClick={copyInvitationLink}
                borderRadius="full"
              >
                {copiedLink ? 'Copied to clipboard!' : 'Invite'}
              </Button>
            ) : null}
            <Popover placement="bottom">
              <PopoverTrigger>
                <Button size="xs" colorScheme="blue" borderRadius="full">
                  Rules
                </Button>
              </PopoverTrigger>
              <PopoverContent zIndex={1001} boxShadow="0px 5px 15px rgba(0,0,0,0.2)">
                <PopoverArrow />
                <PopoverHeader fontWeight="semibold">Game Rules</PopoverHeader>
                <PopoverBody>
                  {formatRules(snapshot.rules).map((rule, i) => (
                    <Text key={i} fontSize="sm">
                      {rule}
                    </Text>
                  ))}
                </PopoverBody>
              </PopoverContent>
            </Popover>
            <Button size="xs" colorScheme="yellow" onClick={leaveGame} borderRadius="full">
              Leave
            </Button>
          </HStack>
        </Flex>
      </Container>
    </Box>
  )
}
