import React from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './app/layout/Layout'
import { ThemeProvider } from '@emotion/react'
import CssBaseline from '@mui/material/CssBaseline'
import theme from './@noctua.core/theme/theme'
import Home from './app/Home'
import SplashScreen from './features/users/components/SplashScreen'
import { AuthProvider } from './features/auth/authProvider'
import RightDrawerContent from './app/layout/RightDrawer'
import GlobalDialog from './@noctua.core/components/dialog/GlobalDIalog'

const routes = [
  {
    path: '/',
    element: <Layout rightDrawerContent={<RightDrawerContent />} />,
    children: [{ path: '', element: <Home /> }],
  },
]

const router = createBrowserRouter(routes, {
  basename: import.meta.env.VITE_BASE_URL,
})

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <CssBaseline />
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <SplashScreen>
            <RouterProvider router={router} />
            <GlobalDialog />
          </SplashScreen>
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  )
}

export default App