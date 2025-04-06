import React from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './app/layout/Layout'
import { ThemeProvider } from '@emotion/react'
import CssBaseline from '@mui/material/CssBaseline'
import theme from './@pango.core/theme/theme'

import Home from './app/Home'
import ActivityForm from './features/gocam/components/forms/ActivityForm'
import SplashScreen from './features/users/components/SplashScreen'
import { AuthProvider } from './features/auth/authProvider'
import RightDrawerContent from './app/layout/RightDrawer'
import GlobalDialog from './@pango.core/components/dialog/GlobalDIalog'

const routes = [
  {
    path: '/',
    element: <Layout rightDrawerContent={<RightDrawerContent />} />,
    children: [{ path: '', element: <Home /> }],
  },
  {
    path: 'form',
    element: <Layout />,
    children: [{ path: '', element: <ActivityForm /> }],
  },
]

const router = createBrowserRouter(routes, {
  future: {
    // v7_startTransition: true,
    // v7_relativeSplatPath: true,
    // v7_fetcherPersist: true,
    // v7_normalizeFormMethod: true,
    // v7_partialHydration: true,
    // v7_skipActionErrorRevalidation: true,
  },
})

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
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
