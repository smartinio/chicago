import {
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  Flex,
  Text,
  SlideFade,
} from '@chakra-ui/react'
import { last } from 'utils/last'
import { useEffect, useState } from 'react'
import { useSnapshot } from 'store'
import { defaultDataHandler } from 'utils/data'
import { trpc } from 'utils/trpc'

const MINIMUM_BID = 6

export const BiddingButtons = () => {
  const [bid, setBid] = useState(5)
  const { snapshot } = useSnapshot()
  const mutationOptions = { onSuccess: defaultDataHandler }
  const foldBidMutation = trpc.foldBid.useMutation(mutationOptions)
  const placeBidMutation = trpc.placeBid.useMutation(mutationOptions)
  const lastBid = last(snapshot?.bids || [])?.numTricks || 0
  const minBid = lastBid ? Math.min(lastBid + 1, 13) : MINIMUM_BID

  useEffect(() => {
    if (bid < minBid) {
      setBid(minBid)
    }
  }, [bid, minBid])

  if (!snapshot) {
    return null
  }

  const { playerSecret, gameId, isMyTurn, currentPlayerId, players } = snapshot

  const currentPlayerName = players.find((player) => player.id === currentPlayerId)?.name || ''

  const foldBid = () => {
    foldBidMutation.mutate({ playerSecret, gameId })
  }

  const placeBid = () => {
    placeBidMutation.mutate({ playerSecret, gameId, isAmerikaner: false, numTricks: bid })
  }

  if (!isMyTurn) {
    return (
      <Text>
        <strong>{currentPlayerName}</strong> is bidding...
      </Text>
    )
  }

  return (
    <SlideFade in offsetY={20}>
      <Flex gap={2} direction="row">
        <Button colorScheme="red" size="md" onClick={foldBid} borderRadius="full">
          Fold
        </Button>
        <NumberInput
          min={minBid}
          max={13}
          allowMouseWheel
          onChange={(_, value) => setBid(value)}
          value={bid}
          width={20}
          size="md"
          color="facebook.900"
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        <Button colorScheme="green" size="md" width="20" onClick={placeBid} borderRadius="full">
          Bid {bid}
        </Button>
      </Flex>
    </SlideFade>
  )
}
