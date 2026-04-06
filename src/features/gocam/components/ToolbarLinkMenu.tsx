import type React from 'react'
import { Button, Menu, MenuItem } from '@mui/material'
import { IoChevronDown } from 'react-icons/io5'
import { usePopover } from '@/@noctua.core/hooks/usePopover'

interface LinkItem {
  label: string
  href: string | undefined
}

interface ToolbarLinkMenuProps {
  label: string
  items: LinkItem[]
}

const ToolbarLinkMenu: React.FC<ToolbarLinkMenuProps> = ({ label, items }) => {
  const menu = usePopover()

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        color="primary"
        onClick={e => menu.open(e.currentTarget)}
        endIcon={<IoChevronDown size={12} />}
        className="!text-xs !normal-case"
      >
        {label}
      </Button>
      <Menu anchorEl={menu.anchor} open={menu.isOpen} onClose={menu.close}>
        {items.map(item => (
          <MenuItem key={item.label} onClick={menu.close}>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              {item.label}
            </a>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

export default ToolbarLinkMenu
