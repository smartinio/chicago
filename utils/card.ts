import { Card } from 'shared/types'

import ACE_CLUBS from 'public/cards/ACE_CLUBS.svg'
import ACE_DIAMONDS from 'public/cards/ACE_DIAMONDS.svg'
import ACE_HEARTS from 'public/cards/ACE_HEARTS.svg'
import ACE_SPADES from 'public/cards/ACE_SPADES.svg'
import EIGHT_CLUBS from 'public/cards/EIGHT_CLUBS.svg'
import EIGHT_DIAMONDS from 'public/cards/EIGHT_DIAMONDS.svg'
import EIGHT_HEARTS from 'public/cards/EIGHT_HEARTS.svg'
import EIGHT_SPADES from 'public/cards/EIGHT_SPADES.svg'
import FIVE_CLUBS from 'public/cards/FIVE_CLUBS.svg'
import FIVE_DIAMONDS from 'public/cards/FIVE_DIAMONDS.svg'
import FIVE_HEARTS from 'public/cards/FIVE_HEARTS.svg'
import FIVE_SPADES from 'public/cards/FIVE_SPADES.svg'
import FOUR_CLUBS from 'public/cards/FOUR_CLUBS.svg'
import FOUR_DIAMONDS from 'public/cards/FOUR_DIAMONDS.svg'
import FOUR_HEARTS from 'public/cards/FOUR_HEARTS.svg'
import FOUR_SPADES from 'public/cards/FOUR_SPADES.svg'
import JACK_CLUBS from 'public/cards/JACK_CLUBS.svg'
import JACK_DIAMONDS from 'public/cards/JACK_DIAMONDS.svg'
import JACK_HEARTS from 'public/cards/JACK_HEARTS.svg'
import JACK_SPADES from 'public/cards/JACK_SPADES.svg'
import KING_CLUBS from 'public/cards/KING_CLUBS.svg'
import KING_DIAMONDS from 'public/cards/KING_DIAMONDS.svg'
import KING_HEARTS from 'public/cards/KING_HEARTS.svg'
import KING_SPADES from 'public/cards/KING_SPADES.svg'
import NINE_CLUBS from 'public/cards/NINE_CLUBS.svg'
import NINE_DIAMONDS from 'public/cards/NINE_DIAMONDS.svg'
import NINE_HEARTS from 'public/cards/NINE_HEARTS.svg'
import NINE_SPADES from 'public/cards/NINE_SPADES.svg'
import QUEEN_CLUBS from 'public/cards/QUEEN_CLUBS.svg'
import QUEEN_DIAMONDS from 'public/cards/QUEEN_DIAMONDS.svg'
import QUEEN_HEARTS from 'public/cards/QUEEN_HEARTS.svg'
import QUEEN_SPADES from 'public/cards/QUEEN_SPADES.svg'
import SEVEN_CLUBS from 'public/cards/SEVEN_CLUBS.svg'
import SEVEN_DIAMONDS from 'public/cards/SEVEN_DIAMONDS.svg'
import SEVEN_HEARTS from 'public/cards/SEVEN_HEARTS.svg'
import SEVEN_SPADES from 'public/cards/SEVEN_SPADES.svg'
import SIX_CLUBS from 'public/cards/SIX_CLUBS.svg'
import SIX_DIAMONDS from 'public/cards/SIX_DIAMONDS.svg'
import SIX_HEARTS from 'public/cards/SIX_HEARTS.svg'
import SIX_SPADES from 'public/cards/SIX_SPADES.svg'
import TEN_CLUBS from 'public/cards/TEN_CLUBS.svg'
import TEN_DIAMONDS from 'public/cards/TEN_DIAMONDS.svg'
import TEN_HEARTS from 'public/cards/TEN_HEARTS.svg'
import TEN_SPADES from 'public/cards/TEN_SPADES.svg'
import THREE_CLUBS from 'public/cards/THREE_CLUBS.svg'
import THREE_DIAMONDS from 'public/cards/THREE_DIAMONDS.svg'
import THREE_HEARTS from 'public/cards/THREE_HEARTS.svg'
import THREE_SPADES from 'public/cards/THREE_SPADES.svg'
import TWO_CLUBS from 'public/cards/TWO_CLUBS.svg'
import TWO_DIAMONDS from 'public/cards/TWO_DIAMONDS.svg'
import TWO_HEARTS from 'public/cards/TWO_HEARTS.svg'
import TWO_SPADES from 'public/cards/TWO_SPADES.svg'

export const cards = {
  ACE_CLUBS,
  ACE_DIAMONDS,
  ACE_HEARTS,
  ACE_SPADES,
  EIGHT_CLUBS,
  EIGHT_DIAMONDS,
  EIGHT_HEARTS,
  EIGHT_SPADES,
  FIVE_CLUBS,
  FIVE_DIAMONDS,
  FIVE_HEARTS,
  FIVE_SPADES,
  FOUR_CLUBS,
  FOUR_DIAMONDS,
  FOUR_HEARTS,
  FOUR_SPADES,
  JACK_CLUBS,
  JACK_DIAMONDS,
  JACK_HEARTS,
  JACK_SPADES,
  KING_CLUBS,
  KING_DIAMONDS,
  KING_HEARTS,
  KING_SPADES,
  NINE_CLUBS,
  NINE_DIAMONDS,
  NINE_HEARTS,
  NINE_SPADES,
  QUEEN_CLUBS,
  QUEEN_DIAMONDS,
  QUEEN_HEARTS,
  QUEEN_SPADES,
  SEVEN_CLUBS,
  SEVEN_DIAMONDS,
  SEVEN_HEARTS,
  SEVEN_SPADES,
  SIX_CLUBS,
  SIX_DIAMONDS,
  SIX_HEARTS,
  SIX_SPADES,
  TEN_CLUBS,
  TEN_DIAMONDS,
  TEN_HEARTS,
  TEN_SPADES,
  THREE_CLUBS,
  THREE_DIAMONDS,
  THREE_HEARTS,
  THREE_SPADES,
  TWO_CLUBS,
  TWO_DIAMONDS,
  TWO_HEARTS,
  TWO_SPADES,
} as const

const valueMap = {
  2: 'TWO',
  3: 'THREE',
  4: 'FOUR',
  5: 'FIVE',
  6: 'SIX',
  7: 'SEVEN',
  8: 'EIGHT',
  9: 'NINE',
  10: 'TEN',
  11: 'JACK',
  12: 'QUEEN',
  13: 'KING',
  14: 'ACE',
} as const

const uppercase = <T extends string>(value: T): Uppercase<T> => {
  return value.toUpperCase() as Uppercase<T>
}

export const getCardSrc = (card: Card) => {
  const VALUE = valueMap[card.value]
  const SUIT = uppercase(card.suit)
  const KEY = `${VALUE}_${SUIT}` as const

  return cards[KEY]
}
