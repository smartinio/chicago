import { Game, Player, Round } from 'game/types'
import { CARDS } from 'game/constants'

export const stubPlayer = (overrides?: Partial<Player>): Player => {
  return {
    cards: new Set(),
    id: 'player-id',
    secret: 'player-secret',
    name: 'player-name',
    score: 0,
    takenChicago: false,
    ...overrides,
  }
}

export const stubNPlayers = (n: number, override?: (n: number) => Partial<Player>) => {
  return Array.from({ length: n }).map((_, i) =>
    stubPlayer({
      id: 'player-' + (i + 1),
      name: 'Player ' + (i + 1),
      ...override?.(i + 1),
    })
  )
}

export const stubRound = ({ ...overrides }: Partial<Round>): Round => {
  return {
    phase: 'throwing',
    tricks: [],
    throwCycles: [],
    ...overrides,
  }
}

export const stubGame = (params: { numPlayers?: number; overrides?: Partial<Game> } = {}): Game => {
  const { numPlayers = 4, overrides } = params
  const fallbackOwner = stubPlayer()
  const players = stubNPlayers(numPlayers)
  const [owner = fallbackOwner, currentPlayer = owner] = players

  return {
    events: [],
    id: 'some-id',
    name: 'Some game',
    deck: [...CARDS],
    owner,
    dealer: owner,
    password: 'pass',
    phase: 'new',
    players,
    round: stubRound({}),
    currentPlayer,
    rules: {
      throwScoreThreshold: 45,
      pointsForWin: 5,
      pointsForWinWithTwo: 10,
      numberOfThrows: 3,
      chicagoRequiresBestHand: true,
      chicagoCanBeCalledBeforeFifteen: true,
      oneOpenMode: 'last',
      handPoints: {
        pair: 1,
        twoPair: 2,
        threeOfAKind: 3,
        straight: 4,
        flush: 5,
        fullHouse: 6,
        fourOfAKind: 7,
        straightFlush: 8,
        royalStraightFlush: 52,
      },
    },
    ...overrides,
  } satisfies Game
}
