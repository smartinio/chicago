import { NextApiRequest, NextApiResponse } from 'next'
import { logger } from 'game/logger'

const keepalive = (_req: NextApiRequest, res: NextApiResponse) => {
  logger.log('keepalive received')
  res.end()
}

export default keepalive
