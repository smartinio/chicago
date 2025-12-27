import { Box, Container, Flex, HStack, Heading, Button, Tag, ThemeTypings } from '@chakra-ui/react'
import { useState } from 'react'
import { clearPlayerGame, setError, useSnapshot } from 'store'
import { dataHandler } from 'utils/data'
import { trpc } from 'utils/trpc'
import { useRouter } from 'next/router'

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
    <Box position="fixed" top={0} left={0} right={0} backgroundColor="black">
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
            <Button size="xs" colorScheme="yellow" onClick={leaveGame} borderRadius="full">
              Leave
            </Button>
          </HStack>
        </Flex>
      </Container>
    </Box>
  )
}
