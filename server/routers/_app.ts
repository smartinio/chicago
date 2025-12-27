import { router } from 'server/trpc'

import { createNewGame } from 'game/actions/createNewGame'
import { joinGame } from 'game/actions/joinGame'
import { leaveGame } from 'game/actions/leaveGame'
import { kickPlayer } from 'game/actions/kickPlayer'
import { playCard } from 'game/actions/playCard'
import { startNewRound } from 'game/actions/startNewRound'
import { snapshotQuery, snapshotSubscription } from 'game/actions/snapshot'
import { keepAlive } from 'game/actions/keepAlive'
import { throwCards } from 'game/actions/throwCards'
import { answerChicago } from 'game/actions/answerChicago'
import { answerOneOpen } from 'game/actions/answerOneOpen'
import { answerFourOfAKind } from 'game/actions/answerFourOfAKind'

export const appRouter = router({
  createNewGame,
  joinGame,
  leaveGame,
  kickPlayer,
  playCard,
  throwCards,
  answerChicago,
  answerOneOpen,
  answerFourOfAKind,
  startNewRound,
  snapshotQuery,
  snapshotSubscription,
  keepAlive,
})

// export type definition of API
export type AppRouter = typeof appRouter
