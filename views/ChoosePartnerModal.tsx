import {
  Button,
  Grid,
  GridItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { useState } from 'react'
import { Card } from 'shared/types'
import { useSnapshot } from 'store'
import { sortBySuitAndValue } from 'utils/sort'
import { PlayingCard } from 'views/PlayingCard'

interface ChoosePartnerModalProps {
  selectedCard?: Card
  isOpen: boolean
  onClose: () => void
  onChoose: (bindingCard: Card) => void
}

export const ChoosePartnerModal = ({
  selectedCard,
  isOpen,
  onClose,
  onChoose,
}: ChoosePartnerModalProps) => {
  const { snapshot } = useSnapshot()
  const [bindingCard, setBindingCard] = useState<Card>()

  if (!snapshot) {
    return null
  }

  const bindingCards = snapshot.othersCards.filter(
    (card) => selectedCard && card.suit === selectedCard.suit
  )

  const sortedBindingCards = sortBySuitAndValue(bindingCards)

  const handleChoose = () => {
    if (bindingCard) {
      onChoose(bindingCard)
    }
    onClose()
  }

  const getGridItemStyle = (card: Card) => {
    const transition = 'all 0.3s ease'

    if (!bindingCard) {
      return {
        transition,
        opacity: 1,
      }
    }

    return {
      transition,
      opacity: bindingCard.id === card.id ? 1 : 0.15,
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Choose Partner</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Grid templateColumns="repeat(5, 1fr)" gap={6}>
            {sortedBindingCards.map((card) => (
              <GridItem key={card.id} w="100%" style={getGridItemStyle(card)}>
                <PlayingCard card={card} onClick={() => setBindingCard(card)} />
              </GridItem>
            ))}
          </Grid>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="blue"
            mr={3}
            onClick={handleChoose}
            isDisabled={!bindingCard}
            opacity={bindingCard ? 1 : 0.2}
          >
            Choose
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
