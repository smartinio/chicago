import Image from 'next/legacy/image'
import { Box, BoxProps, Flex } from '@chakra-ui/react'
import { Card } from 'shared/types'
import { getCardSrc } from 'utils/card'

interface PlayingCardProps {
  card: Card
  pulse?: boolean
  trump?: boolean
}

export const PlayingCard = ({ card, pulse, trump, ...boxProps }: PlayingCardProps & BoxProps) => {
  return (
    <Box {...boxProps} overflow="visible">
      <Flex
        flexShrink={1}
        borderRadius="md"
        style={{
          animation: pulse ? 'pulse-red 1s infinite' : undefined,
        }}
      >
        <Image alt={card.id} src={getCardSrc(card)} priority />
      </Flex>
    </Box>
  )
}
