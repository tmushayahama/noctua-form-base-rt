import type React from 'react'
import { useState } from 'react'
import { Button, IconButton, Menu, MenuItem } from '@mui/material'
import { FaGithub } from 'react-icons/fa'
import { IoChevronDown } from 'react-icons/io5'
import { useAuth } from '@/features/auth/authProvider'
import { useAppSelector } from '../hooks'
import type { RootState } from '../store/store'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'

const Toolbar: React.FC = () => {
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  const [helpMenuAnchor, setHelpMenuAnchor] = useState<null | HTMLElement>(null)

  const { isLoggedIn, loginUrl, logoutUrl, noctuaUrl } = useAuth()
  const user = useAppSelector((state: RootState) => state.auth.user)

  const isDev = ENVIRONMENT.isDev

  const logout = () => {
    window.location.href = logoutUrl
  }

  return (
    <div className="relative flex h-full items-center py-0 pl-1 pr-[10px]">
      {/* Logo / Branding — left side */}
      <div className="flex h-full flex-row items-center justify-start py-1">
        <a
          className="mr-1 text-xl font-bold text-[#555] no-underline hover:text-black"
          href={noctuaUrl}
          target="_blank"
          rel="noreferrer"
        >
          Noctua
        </a>
        <a
          className="mr-1 text-xl text-[#555] no-underline hover:text-black"
          href="/"
          onClick={e => {
            e.preventDefault()
            window.location.reload()
          }}
        >
          Pathway Editor
        </a>
        {isDev && <small className="text-xs text-[#555]">(dev)</small>}
      </div>

      {/* Right-aligned section */}
      <div className="flex flex-1 flex-row items-center justify-end">
        {/* GitHub */}
        <div className="flex flex-row items-center border-r border-[#BBB] pr-3">
          <IconButton
            href="https://github.com/geneontology/go-ontology/issues"
            target="_blank"
            rel="noreferrer"
            color="inherit"
            size="small"
          >
            <FaGithub />
          </IconButton>
        </div>

        {/* Help */}
        <div className="flex flex-row items-center border-r border-[#BBB] pl-3 pr-3">
          <Button onClick={e => setHelpMenuAnchor(e.currentTarget)}>Help</Button>
          <Menu
            anchorEl={helpMenuAnchor}
            open={Boolean(helpMenuAnchor)}
            onClose={() => setHelpMenuAnchor(null)}
          >
            <MenuItem onClick={() => setHelpMenuAnchor(null)}>
              <a
                href="https://docs.google.com/document/d/1a5YZBJrnJ9LKJxPVpXk62dJJGpHB2b9zH8-xr_Rm1Vs"
                target="_blank"
                rel="noreferrer"
                className="w-full"
              >
                Noctua User&apos;s Guide
              </a>
            </MenuItem>
          </Menu>
        </div>

        {/* User / Login */}
        <div className="flex flex-row items-center border-r border-[#BBB] pr-3">
          {isLoggedIn && user ? (
            <>
              <Button
                className="!h-10 !text-left !normal-case !text-xs"
                onClick={e => setUserMenuAnchor(e.currentTarget)}
              >
                <div className="flex flex-row items-center">
                  <div className="mr-[5px] flex max-w-[150px] flex-col items-start overflow-hidden leading-5">
                    <div className="truncate">{user.name}</div>
                    <div className="truncate text-[10px] text-[#888]">
                      {user.group?.label}
                    </div>
                  </div>
                  <IoChevronDown />
                </div>
              </Button>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
              >
                <MenuItem onClick={logout} className="w-full text-red-500">
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <div>
              <Button
                href={loginUrl}
                className="!bg-[#52a16c] !text-white hover:!bg-green-700"
                data-pw="noc-login-button"
              >
                Login
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* GO Logo — right side */}
      <div className="flex h-full w-[200px] flex-row items-center justify-start border-r border-[#BBB] py-1 pl-2">
        <a href="http://geneontology.org/" target="_blank" rel="noreferrer">
          <img
            src="assets/images/logos/go-logo.large.png"
            alt="GO Logo"
            className="h-10"
          />
        </a>
      </div>

      {/* Alliance Logo — far right */}
      <div className="border-l border-[#BBB] py-1">
        <a href="https://www.alliancegenome.org" target="_blank" rel="noreferrer">
          <img
            src="assets/images/logos/alliance-logo.png"
            alt="Alliance Logo"
            className="h-10"
          />
        </a>
      </div>
    </div>
  )
}

export default Toolbar
