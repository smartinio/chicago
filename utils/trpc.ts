import { createWSClient, httpBatchLink, wsLink } from '@trpc/client'
import { createTRPCNext } from '@trpc/next'
import { ssrPrepass } from '@trpc/next/ssrPrepass'
import { SERVER_HOST, SERVER_PORT, WS_PORT } from '#shared/constants'
import type { AppRouter } from '../server/routers/_app'

function getEndingLink() {
  if (typeof window === 'undefined') {
    return httpBatchLink({
      /**
       * If you want to use SSR, you need to use the server's full URL
       * @link https://trpc.io/docs/ssr
       **/
      url:
        process.env.NODE_ENV === 'development'
          ? `http://${SERVER_HOST}:${SERVER_PORT}/api/trpc`
          : `https://${SERVER_HOST}/api/trpc`,
    })
  }

  // Use the actual hostname the page was loaded from (important for mobile/LAN access in dev)
  const wsHost = window.location.hostname
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  // In dev, use WS_PORT (3001). In prod, omit port to use default (443 for wss)
  const wsUrl =
    process.env.NODE_ENV === 'development'
      ? `${wsProtocol}//${wsHost}:${WS_PORT}/ws`
      : `${wsProtocol}//${wsHost}/ws`

  return wsLink({
    client: createWSClient({
      url: wsUrl,
    }),
  })
}

export const trpc = createTRPCNext<AppRouter>({
  config({ ctx }) {
    return {
      links: [getEndingLink()],
      /**
       * @link https://tanstack.com/query/v4/docs/reference/QueryClient
       **/
      // queryClientConfig: { defaultOptions: { queries: { staleTime: 60 } } },
    }
  },
  /**
   * @link https://trpc.io/docs/ssr
   **/
  ssr: true,
  ssrPrepass,
})
// => { useQuery: ..., useMutation: ...}
