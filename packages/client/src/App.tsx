import * as React from "react"
import {
  ChakraProvider,
  Box,
  Grid,
} from "@chakra-ui/react"
import { ColorModeSwitcher } from "./components/ColorModeSwitcher"
import { Routes, Route } from 'react-router-dom'
import ThreadPage from "./pages/thread/thread"
import Catalog from "./pages/board/catalog"
import theme from "./theme"
import BoardList from "./components/ListBoards"
import Home from "./pages/home/home"
// import MembershipSetup from "./pages/membership/membership"

export const App = () => (
  <ChakraProvider theme={theme}>
    <Box fontSize="xl">
      <Grid p={3}>
        <Grid templateColumns='repeat(2, 1fr)'><BoardList /><ColorModeSwitcher justifySelf="flex-end" /></Grid>
        <Box marginTop={5} marginBottom={5}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/:board/catalog" element={<Catalog />} />
            <Route path="/:board/thread/:id" element={<ThreadPage />} />
            {/* <Route path="/setup" element={<MembershipSetup />} /> */}
          </Routes>
        </Box>
      </Grid>
    </Box>
  </ChakraProvider>
)
