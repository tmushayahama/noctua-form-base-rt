import type React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Toolbar from './Toolbar'
import Footer from './Footer'
import { selectRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import { useAppSelector } from '../hooks'
import { initGA, trackPageView } from '@/analytics'
import { useEffect } from 'react'
import { useMediaQuery } from '@mantine/hooks'
import CamToolbar from '@/features/gocam/components/CamToolbar'
import LoadingOverlay from '@/@noctua.core/components/loading-overlay/LoadingOverlay'

interface LayoutProps {
  rightDrawerContent?: React.ReactNode
}
const Layout: React.FC<LayoutProps> = ({ rightDrawerContent }) => {
  const location = useLocation()
  const isMobile = useMediaQuery('(max-width: 36em)')

  const rightDrawerOpen = useAppSelector(selectRightDrawerOpen)

  useEffect(() => {
    initGA('G-LHBLYRN338')
  }, [])

  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location])

  return (
    <div className="flex h-screen w-full flex-col bg-gray-300">
      <LoadingOverlay />
      <div className="fixed left-0 top-0 z-50 h-12 w-full border-b-2 border-b-primary-500">
        <Toolbar />
      </div>
      <div className="fixed z-40 flex w-full flex-1" style={{ top: 50 }}>
        <CamToolbar />
      </div>

      <div className="fixed flex w-full flex-1" style={{ top: 94, bottom: 0 }}>

        <div className="flex-1 overflow-auto">
          <Outlet />
          <Footer />
        </div>

        {rightDrawerContent && (
          <div
            className={`fixed right-0 overflow-hidden border-l border-gray-300 bg-white shadow-[-4px_0_12px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out ${rightDrawerOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            style={{
              top: 120,
              height: 'calc(100vh - 120px)',
              width: isMobile ? '100%' : 800,
            }}
          >
            {rightDrawerContent}
          </div>
        )}
      </div>
    </div>
  )
}

export default Layout
