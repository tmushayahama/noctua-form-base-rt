import type React from 'react'
import { Menu, MenuItem } from '@mui/material'
import { usePopover } from '@/@noctua.core/hooks/usePopover'
import type { Contributor } from '@/features/users/models/contributor'

const MAX_VISIBLE = 2

interface ContributorChipsProps {
  contributors: Contributor[]
}

const ContributorChips: React.FC<ContributorChipsProps> = ({ contributors }) => {
  const overflowMenu = usePopover()

  const visible = contributors.slice(0, MAX_VISIBLE)
  const hidden = contributors.slice(MAX_VISIBLE)

  return (
    <div className="flex flex-grow items-center overflow-x-auto px-2">
      <div className="flex flex-nowrap">
        {visible.map(contributor => (
          <div
            key={contributor.uri}
            className="mr-2 flex h-6 max-w-[180px] items-center truncate rounded-full border border-gray-400 bg-gray-100 pr-2 text-xs"
          >
            <div className="text-2xs mr-1 flex h-full min-w-6 items-center justify-center rounded-full border-r border-slate-300 bg-slate-50 text-center font-bold text-slate-600">
              {contributor.initials}
            </div>
            <span className="flex-grow truncate">{contributor.name}</span>
          </div>
        ))}

        {hidden.length > 0 && (
          <>
            <button
              className="flex h-6 cursor-pointer items-center rounded-full border border-gray-400 bg-gray-100 px-2"
              onClick={e => overflowMenu.open(e.currentTarget)}
            >
              <span>...</span>
            </button>
            <Menu
              anchorEl={overflowMenu.anchor}
              open={overflowMenu.isOpen}
              onClose={overflowMenu.close}
            >
              {hidden.map(contributor => (
                <MenuItem key={contributor.uri} onClick={overflowMenu.close}>
                  <div className="flex items-center">
                    <div className="text-2xs mr-1 flex h-6 w-6 items-center justify-center rounded-full bg-grey-400 text-center font-bold">
                      {contributor.initials}
                    </div>
                    <span>{contributor.name}</span>
                  </div>
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </div>
    </div>
  )
}

export default ContributorChips
