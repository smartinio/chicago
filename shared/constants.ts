export const MIN_GAME_NAME_LENGTH = 2
export const MIN_PLAYER_NAME_LENGTH = 2

export const MAX_GAME_NAME_LENGTH = 10
export const MAX_PLAYER_NAME_LENGTH = 8

export const SERVER_PORT = Number(process.env.PORT) || 3000
export const WS_PORT = process.env.NODE_ENV === 'production' ? SERVER_PORT : 3001
export const SERVER_HOST =
  process.env.NODE_ENV === 'production' ? 'chicago2.smartin.io' : 'localhost'
