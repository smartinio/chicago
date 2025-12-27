// server.js
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { SERVER_HOST, SERVER_PORT } from 'shared/constants'
import { createWSS } from './ws'

const dev = process.env.NODE_ENV !== 'production'
const hostname = SERVER_HOST
const port = SERVER_PORT

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url?.toString() as string, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    if (process.env.BOOT_TEST) {
      setTimeout(() => process.exit(0), 3000)
    }
  })

  createWSS(server)
})
