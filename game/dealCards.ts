import { randomInt } from 'node:crypto'
import { CARDS } from './constants'
import { Card, Game } from './types'
import { getNext } from './utils'

const shuffleInPlace = (deck: Card[]) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
}

export const dealCards = (game: Game) => {
  for (const player of game.players) {
    player.cards.clear()
  }

  const cardsToDeal = game.players.length * 5

  const deck = Array.from(CARDS)
  shuffleInPlace(deck)

  let receivingPlayer = game.dealer

  for (const card of deck.slice(0, cardsToDeal)) {
    receivingPlayer = getNext(game.players, (p) => p.id === receivingPlayer.id)
    receivingPlayer.cards.add(card)
  }

  return deck.slice(cardsToDeal)
}
