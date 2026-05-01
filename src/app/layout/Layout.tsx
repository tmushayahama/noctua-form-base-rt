import type React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Toolbar from './Toolbar'
import Footer from './Footer'
import { selectRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import { useAppSelector } from '../hooks'
import { initGA, trackPageView } from '@/analytics'
import { useEffect } from 'react'
import { useMediaQuery } from '@mantine/hooks'
import { ENVIRONMENT, EXTERNAL_LINKS } from '@/@noctua.core/data/constants'
import CamToolbar from '@/features/gocam/components/CamToolbar'

interface LayoutProps {
  rightDrawerContent?: React.ReactNode
}
const Layout: React.FC<LayoutProps> = ({ rightDrawerContent }) => {
  const isDev = ENVIRONMENT.isDev
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
      {isDev && (
        <div className="text-2xs flex h-[25px] items-center justify-center bg-orange-300 py-2 font-bold uppercase">
          Testing Version. Visit{' '}
          <a
            className="hover:underline"
            href={EXTERNAL_LINKS.NOCTUA_PRODUCTION}
            target="_blank"
            rel="noreferrer"
          >
            Noctua
          </a>{' '}
          for production version
        </div>
      )}
      <div
        className={`fixed left-0 z-50 h-[50px] w-full border-b-2 border-b-primary-500 bg-white`}
        style={{ top: isDev ? 25 : 0 }}
      >
        <Toolbar />
      </div>
      <div className="fixed flex w-full flex-1" style={{ top: isDev ? 75 : 50 }}>
        <CamToolbar />
      </div>

      <div className="fixed flex w-full flex-1" style={{ top: isDev ? 115 : 90, bottom: 0 }}>

        <div className="flex-1 overflow-auto">
          <Outlet />
          <Footer />
        </div>

        {rightDrawerContent && (
          <div
            className={`fixed right-0 overflow-hidden border-l border-gray-300 bg-white shadow-[-4px_0_12px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out ${
              rightDrawerOpen ? 'translate-x-0' : 'translate-x-full'
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
