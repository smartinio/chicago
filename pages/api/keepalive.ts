import { NextApiRequest, NextApiResponse } from 'next'

const keepalive = (_req: NextApiRequest, res: NextApiResponse) => {
  console.log('keepalive received')
  res.end()
}

export default keepalive
