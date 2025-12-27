import dynamic from 'next/dynamic'

import './app.css'

const App = dynamic(() => import('views/App'), { ssr: false })

export default App
