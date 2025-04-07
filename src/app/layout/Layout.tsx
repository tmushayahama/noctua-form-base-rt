import type React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Toolbar from './Toolbar'
import Footer from './Footer'
import {
  selectLeftDrawerOpen,
  selectRightDrawerOpen,
  setRightDrawerOpen,
} from '@/@pango.core/components/drawer/drawerSlice'
import { useAppDispatch, useAppSelector } from '../hooks'
import { trackPageView } from '@/analytics'
import { useEffect } from 'react'
import useMediaQuery from '@mui/material/useMediaQuery'
import useTheme from '@mui/material/styles/useTheme'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import { ENVIRONMENT } from '@/@pango.core/data/constants'
import CamToolbar from '@/features/gocam/components/CamToolbar'

interface LayoutProps {
  leftDrawerContent?: React.ReactNode
  rightDrawerContent?: React.ReactNode
}
// TODO update google analytics
const drawerWidth = 420

const Layout: React.FC<LayoutProps> = ({ leftDrawerContent, rightDrawerContent }) => {
  const isDev = ENVIRONMENT.isDev
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const dispatch = useAppDispatch()

  const leftDrawerOpen = useAppSelector(selectLeftDrawerOpen)
  const rightDrawerOpen = useAppSelector(selectRightDrawerOpen)

  const handleRightDrawerClose = () => {
    dispatch(setRightDrawerOpen(false))
  }

  useEffect(() => {
    //initGA('G-245RCHN2PQ')
  }, [])

  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location])

  return (
    <Box className="flex h-screen w-full flex-col bg-gray-300">
      {isDev && (
        <div className='h-[25px] py-2 flex justify-center items-center text-2xs uppercase font-bold bg-orange-300'>
          Testing Version. Visit{' '}
          <a className="hover:underline" href="http://noctua.geneontology.org/" target="_blank" rel="noreferrer">
            Noctua
          </a> {' '} for production version
        </div>
      )}
      <div className="fixed left-0 z-50 h-[50px] w-full bg-white border-b-primary-500 border-b" style={{ top: isDev ? 25 : 0 }}>
        <Toolbar />
      </div>
      <div className="fixed flex w-full flex-1" style={{ top: isDev ? 75 : 50 }}>
        <CamToolbar />
      </div>

      <Box className="fixed flex w-full flex-1" style={{ top: isDev ? 115 : 90, bottom: 0 }}>

        {leftDrawerContent && (
          <Box
            sx={{
              width: leftDrawerOpen ? (isMobile ? '100%' : drawerWidth) : 0,
              height: '100%',
              transition: theme =>
                theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
              overflow: 'hidden',
            }}
          >
            <Drawer
              variant="persistent"
              anchor="left"
              open={leftDrawerOpen}
              sx={{
                height: '100%',
                '& .MuiDrawer-paper': {
                  position: 'static',
                  width: isMobile ? '100%' : drawerWidth,
                  height: '100%',
                  overflow: 'auto',
                },
              }}
            >
              {leftDrawerContent}
            </Drawer>
          </Box>
        )}

        <div className="flex-1 overflow-auto">
          <Outlet />
          <Footer />
        </div>

        {rightDrawerContent && (
          <Drawer
            variant="persistent"
            anchor="right"
            open={rightDrawerOpen}
            onClose={handleRightDrawerClose}
            ModalProps={{
              keepMounted: false,
            }}
            sx={{
              '& .MuiDrawer-paper': {
                width: isMobile ? '100%' : 800,
                top: 120,
                height: '100%',
                overflow: 'auto',
                transition: theme =>
                  theme.transitions.create('transform', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                  }),
              },
            }}
          >
            {rightDrawerContent}
          </Drawer>
        )}
      </Box>
    </Box>
  )
}

export default Layout
