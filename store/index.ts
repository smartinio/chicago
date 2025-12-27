import { Errors, Results } from 'game/types'
import { Snapshot } from 'shared/types'
import { persist } from 'zustand/middleware'
import { create } from 'zustand'

export const useSnapshot = create(() => ({
  snapshot: undefined as Snapshot | undefined,
}))

export const setSnapshot = (snapshot: Snapshot) => useSnapshot.setState({ snapshot })

export const useResults = create(() => ({
  error: undefined as Errors | undefined,
  result: undefined as Results | undefined,
}))

export const setError = (error?: Errors) => useResults.setState({ error })

export const setResult = (result?: Results) => useResults.setState({ result })

// Save this separately to allow disconnects / refreshes
interface PlayerGame {
  gameId: string
  playerId: string
  playerSecret: string
}

export const usePlayerGame = create<PlayerGame, [['zustand/persist', PlayerGame]]>(
  persist(() => ({ gameId: '', playerId: '', playerSecret: '' }), {
    name: 'player-game-storage',
  })
)

export const clearPlayerGame = () => {
  usePlayerGame.setState(() => ({ gameId: '', playerId: '', playerSecret: '' }))
}

export const setPlayerId = ({ playerId }: { playerId: string }) => {
  usePlayerGame.setState((state) => ({ ...state, playerId }))
}

export const setPlayerSecret = ({ playerSecret }: { playerSecret: string }) => {
  usePlayerGame.setState((state) => ({ ...state, playerSecret }))
}

export const setGameId = ({ gameId }: { gameId: string }) => {
  usePlayerGame.setState((state) => ({ ...state, gameId }))
}

export const setPlayerGame = (params: {
  playerId?: string
  playerSecret?: string
  gameId?: string
}) => {
  usePlayerGame.setState(params)
}
