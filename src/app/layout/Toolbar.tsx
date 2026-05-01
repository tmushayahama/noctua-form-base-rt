import type React from 'react'
import { ActionIcon, Button } from '@mantine/core'
import AnchoredMenu, { MenuItem } from '@/@noctua.core/components/menu/AnchoredMenu'
import { usePopover } from '@/@noctua.core/hooks/usePopover'
import { FaGithub } from 'react-icons/fa'
import { IoChevronDown } from 'react-icons/io5'
import { useAuth } from '@/features/auth/authProvider'
import { useAppSelector } from '../hooks'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import { ENVIRONMENT, EXTERNAL_LINKS } from '@/@noctua.core/data/constants'

const Toolbar: React.FC = () => {
  const userMenu = usePopover()
  const helpMenu = usePopover()

  const { isLoggedIn, loginUrl, logoutUrl, noctuaUrl } = useAuth()
  const user = useAppSelector(selectAuthUser)

  const isDev = ENVIRONMENT.isDev

  const logout = () => {
    window.location.href = logoutUrl
  }

  return (
    <div className="relative flex h-full items-center py-0 pl-1 pr-3">
      {/* Logo / Branding — left side */}
      <div className="flex h-full flex-row items-center justify-start py-1">
        <a
          className="mr-1 text-xl font-bold text-gray-900 no-underline hover:text-black"
          href={noctuaUrl}
          target="_blank"
          rel="noreferrer"
        >
          Noctua
        </a>
        <a
          className="mr-1 text-xl text-gray-900 no-underline hover:text-black"
          href="/"
          onClick={e => {
            e.preventDefault()
            window.location.reload()
          }}
        >
          Pathway Editor
        </a>
        {isDev && <small className="text-xs text-gray-900">(dev)</small>}
      </div>

      {/* Right-aligned section */}
      <div className="flex flex-1 flex-row items-center justify-end">
        {/* GitHub */}
        <div className="flex flex-row items-center border-r border-gray-300 pr-3">
          <ActionIcon
            component="a"
            href={EXTERNAL_LINKS.GO_ONTOLOGY_ISSUES}
            target="_blank"
            rel="noreferrer"
            variant="subtle"
            color="gray"
            size="md"
          >
            <FaGithub />
          </ActionIcon>
        </div>

        {/* Help */}
        <div className="flex flex-row items-center border-r border-gray-300 pl-3 pr-3">
          <Button variant="subtle" onClick={e => helpMenu.open(e.currentTarget)}>Help</Button>
          <AnchoredMenu
            anchorEl={helpMenu.anchor}
            open={helpMenu.isOpen}
            onClose={helpMenu.close}
          >
            <MenuItem onClick={helpMenu.close}>
              <a
                href={EXTERNAL_LINKS.NOCTUA_USERS_GUIDE}
                target="_blank"
                rel="noreferrer"
                className="w-full"
              >
                Noctua User&apos;s Guide
              </a>
            </MenuItem>
          </AnchoredMenu>
        </div>

        {/* User / Login */}
        <div className="flex flex-row items-center border-r border-gray-300 pr-3">
          {isLoggedIn && user ? (
            <>
              <Button
                variant="subtle"
                className="!h-10 !text-left !normal-case !text-xs"
                onClick={e => userMenu.open(e.currentTarget)}
              >
                <div className="flex flex-row items-center">
                  <div className="mr-1.5 flex max-w-[150px] flex-col items-start overflow-hidden leading-5">
                    <div className="truncate">{user.name}</div>
                    <div className="truncate text-[10px] text-gray-500">
                      {user.group?.label}
                    </div>
                  </div>
                  <IoChevronDown />
                </div>
              </Button>
              <AnchoredMenu
                anchorEl={userMenu.anchor}
                open={userMenu.isOpen}
                onClose={userMenu.close}
                placement="bottom-end"
              >
                <MenuItem onClick={logout} className="text-red-500">
                  Logout
                </MenuItem>
              </AnchoredMenu>
            </>
          ) : (
            <div>
              <Button
                component="a"
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
      <div className="flex h-full w-[200px] flex-row items-center justify-start border-r border-gray-300 py-1 pl-2">
        <a href={EXTERNAL_LINKS.GO_HOMEPAGE} target="_blank" rel="noreferrer">
          <img
            src="assets/images/logos/go-logo.large.png"
            alt="GO Logo"
            className="h-10"
          />
        </a>
      </div>

      {/* Alliance Logo — far right */}
      <div className="border-l border-gray-300 py-1">
        <a href={EXTERNAL_LINKS.ALLIANCE_GENOME} target="_blank" rel="noreferrer">
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
