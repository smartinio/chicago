import { BestHand } from '#game/utils'

export type Suit = 'spades' | 'clubs' | 'hearts' | 'diamonds'
export type Value = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export type Player = {
  readonly id: string
  readonly secret: string
  readonly cards: Set<Card>
  takenChicago: boolean
  name: string
  score: number
}

export type Card = {
  readonly id: `${Suit}:${Value}`
  readonly suit: Suit
  readonly value: Value
}

export type PlayedCard = {
  readonly player: Player
  readonly card: Card
}

export type Trick = {
  readonly playedCards: PlayedCard[]
}

export type RoundPhase =
  | 'throwing'
  | 'tricking'
  | 'asking_chicago'
  | 'asking_four_of_a_kind'
  | 'asking_one_open'
  | 'killed'
  | 'over'

export type Round = {
  readonly tricks: Trick[]
  phase: RoundPhase
  throwCycles: boolean[][]
  chicagoCaller?: Player
  bestHandPlayers?: BestHand[]
  openCard?: Card
  winner?: Player
}

export type EventAction =
  | 'joined_team'
  | 'left_game'
  | 'kicked_player'
  | 'played_card'
  | 'made_it_rain'
  | 'had_hand_type'
  | 'killed_round'
  | 'restarted_round'
  | 'received_points'
  | 'started_round'
  | 'lost_chicago'
  | 'threw_cards'
  | 'won_trick'
  | 'won_round'
  | 'won_game'
  | 'answered_one_open'
  | 'answered_chicago'
  | 'answered_four_of_a_kind'

export type GameEvent = {
  id: string
  actor: Player | 'server'
  action: EventAction
  timestamp: number
  card?: Card
  cards?: Card[]
  startingCard?: Card
  player?: Player
  count?: number
  handType?: HandType
  points?: number
  accepted?: boolean
  answer?: 'points' | 'reset_others'
}

export type GamePhase = 'new' | 'round' | 'over'

export type Game = {
  readonly id: string
  deck: Card[]
  events: GameEvent[]
  players: Player[]
  phase: GamePhase
  name: string
  owner: Player
  dealer: Player
  currentPlayer: Player
  round: Round
  password?: string
  rules: {
    throwScoreThreshold: number
    pointsForWin: number
    pointsForWinWithTwo: number
    numberOfThrows: number
    chicagoRequiresBestHand: boolean
    chicagoCanBeCalledBeforeFifteen: boolean
    oneOpenMode: 'all' | 'last'
    handPoints: {
      pair: number
      twoPair: number
      threeOfAKind: number
      straight: number
      flush: number
      fullHouse: number
      fourOfAKind: number
      straightFlush: number
      royalStraightFlush: number
    }
  }
}

export type HandType = keyof Game['rules']['handPoints']

export enum Errors {
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  CARD_NOT_IN_HAND = 'CARD_NOT_IN_HAND',
  INVALID_PHASE = 'INVALID_PHASE',
  PLAYER_ALREADY_JOINED = 'PLAYER_ALREADY_JOINED',
  NAME_ALREADY_TAKEN = 'NAME_ALREADY_TAKEN',
  TOO_FEW_PLAYERS = 'TOO_FEW_PLAYERS',
  TOO_MANY_PLAYERS = 'TOO_MANY_PLAYERS',
  UNEXPECTED = 'UNEXPECTED',
}

export enum Results {
  CREATED_GAME = 'CREATED_GAME',
  JOINED_GAME = 'JOINED_GAME',
  PLAYED_TRICK = 'PLAYED_TRICK',
  THREW_CARDS = 'THREW_CARDS',
  SKIPPED_THROW = 'SKIPPED_THROW',
  STARTED_ROUND = 'STARTED_ROUND',
  ROUND_OVER = 'ROUND_OVER',
  GAME_OVER = 'GAME_OVER',
  LEFT_GAME = 'LEFT_GAME',
  KICKED_PLAYER = 'KICKED_PLAYER',
  DESTROYED_GAME = 'DESTROYED_GAME',
  ANSWERED_CHICAGO = 'ANSWERED_CHICAGO',
  ANSWERED_ONE_OPEN = 'ANSWERED_ONE_OPEN',
}

const errors = new Set(Object.values(Errors))
const results = new Set(Object.values(Results))

export const isError = <T extends Errors, S>(data: T | S): data is T => {
  return errors.has(data as Errors)
}

export const isSuccess = <T extends Results, S>(data: T | S): data is T => {
  return results.has(data as Results)
}

export type ActionContract = {
  action: string
  params: Record<string, any>
}

export type Action<T extends ActionContract> = (params: T['params']) => any
