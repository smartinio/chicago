import {
  Container,
  VStack,
  Heading,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { CreateGame } from 'views/CreateGame'
import { JoinGame } from 'views/JoinGame'

export const Start = () => {
  const router = useRouter()
  const hasGameIdInUrl = typeof router.query.id === 'string' && router.query.id.length > 0

  return (
    <Container marginTop="60px">
      <VStack>
        <Heading pb="8">Chicago</Heading>
        <Tabs
          variant="enclosed-colored"
          isFitted
          width="100%"
          defaultIndex={hasGameIdInUrl ? 1 : 0}
        >
          <TabList>
            <Tab>Create game</Tab>
            <Tab>Join game</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <CreateGame />
            </TabPanel>
            <TabPanel>
              <JoinGame />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  )
}
