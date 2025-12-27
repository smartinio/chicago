import type { AppType } from 'next/app'

import React, { useEffect } from 'react'
import Head from 'next/head'
import { Inter } from 'next/font/google'
import { trpc } from 'utils/trpc'
import { ChakraProvider } from '@chakra-ui/react'
import { clearPlayerGame, setError, useResults } from 'store'
import { Errors } from 'game/types'
import { useRouter } from 'next/router'
import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
})

class ErrorBoundary extends React.Component<{ children: any }, { hasError: boolean }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('<ErrorBoundary>')
    console.error(error)
    console.error(errorInfo)
    console.error('</ErrorBoundary>')
  }

  render() {
    if (this.state.hasError) {
      return 'Oopsie'
    }

    return this.props.children
  }
}

const font = Inter({ subsets: ['latin'] })

const App = ({ children }: any) => {
  const { error } = useResults()
  const router = useRouter()

  useEffect(() => {
    if (!error) return

    switch (error) {
      case Errors.GAME_NOT_FOUND: {
        setError(undefined)
        alert('That game does not exist anymore')
        clearPlayerGame()
        router.push('/')
        break
      }
    }
  }, [error, router])

  return (
    <div>
      <Head>
        <title>Chicago</title>
        <meta property="og:title" content="Chicago" />
        <meta name="robots" content="noindex" />
        <meta
          name="viewport"
          content="minimum-scale=1.0, initial-scale=1.0, width=device-width, height=device-height,  maximum-scale=1.0, user-scalable=no"
        />
      </Head>
      <main className={font.className}>
        <ErrorBoundary>
          <ChakraProvider theme={theme}>{children}</ChakraProvider>
        </ErrorBoundary>
      </main>
    </div>
  )
}

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <App>
      <Component {...pageProps} />
    </App>
  )
}

export default trpc.withTRPC(MyApp)
