import { Game, Player, Round } from 'game/types'

export const stubPlayer = (overrides?: Partial<Player>): Player => {
  return {
    cards: new Set(),
    id: 'player-id',
    secret: 'player-secret',
    name: 'player-name',
    score: 0,
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

export const stubRound = ({
  currentPlayer,
  ...overrides
}: { currentPlayer: Player } & Partial<Round>): Round => {
  return {
    bids: [],
    currentPlayer,
    folds: new Set(),
    phase: 'bidding',
    tricks: [],
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
    owner,
    dealer: owner,
    password: 'pass',
    phase: 'new',
    players,
    round: stubRound({
      currentPlayer,
    }),
    ...overrides,
  }
}
