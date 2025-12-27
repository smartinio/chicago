import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { setGameId } from 'store'
import { Start } from 'views/Start'

const Index = () => {
  const router = useRouter()

  useEffect(() => {
    if (typeof router.query.id !== 'string') {
      setGameId({ gameId: '' })
    }
  }, [router.query.id])

  return <Start />
}

export default Index
