import type { ReactNode } from 'react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Portal } from '@mantine/core'

interface AnchoredMenuProps {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  /** Preferred placement; auto-flips when the menu would overflow the viewport. */
  placement?: 'bottom-start' | 'bottom-end'
}

const VIEWPORT_PAD = 4
const ANCHOR_GAP = 4

const AnchoredMenu = ({
  anchorEl,
  open,
  onClose,
  children,
  className,
  placement = 'bottom-start',
}: AnchoredMenuProps) => {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!open || !anchorEl || !el) return

    const anchorRect = anchorEl.getBoundingClientRect()

    el.style.position = 'fixed'
    el.style.visibility = 'hidden'
    el.style.top = `${anchorRect.bottom + ANCHOR_GAP}px`
    el.style.left = ''
    el.style.right = ''

    if (placement === 'bottom-end') {
      el.style.right = `${Math.max(VIEWPORT_PAD, window.innerWidth - anchorRect.right)}px`
    } else {
      el.style.left = `${Math.max(VIEWPORT_PAD, anchorRect.left)}px`
    }

    const menuRect = el.getBoundingClientRect()

    if (placement === 'bottom-start' && menuRect.right > window.innerWidth - VIEWPORT_PAD) {
      el.style.left = ''
      el.style.right = `${Math.max(VIEWPORT_PAD, window.innerWidth - anchorRect.right)}px`
    } else if (placement === 'bottom-end' && menuRect.left < VIEWPORT_PAD) {
      el.style.right = ''
      el.style.left = `${Math.max(VIEWPORT_PAD, anchorRect.left)}px`
    }

    const settled = el.getBoundingClientRect()
    if (settled.bottom > window.innerHeight - VIEWPORT_PAD) {
      const flippedTop = anchorRect.top - settled.height - ANCHOR_GAP
      el.style.top = `${Math.max(VIEWPORT_PAD, flippedTop)}px`
    }

    el.style.visibility = 'visible'
  }, [open, anchorEl, placement])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (ref.current?.contains(target)) return
      if (anchorEl?.contains(target)) return
      if (
        target.closest(
          '[role="listbox"], [role="menu"], [role="dialog"], [role="tooltip"], [role="combobox"], [data-portal], [data-mantine-stop-propagation]'
        )
      ) {
        return
      }
      if (target.closest('[class*="Select"], [class*="Combobox"], [class*="Popover-dropdown"], [class*="Menu-dropdown"]')) {
        return
      }
      onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, anchorEl, onClose])

  if (!open) return null

  return (
    <Portal>
      <div
        ref={ref}
        className={`z-[1300] min-w-[160px] rounded-md border border-gray-200 bg-white py-1 shadow-lg ${className ?? ''}`}
        style={{ position: 'fixed', visibility: 'hidden' }}
      >
        {children}
      </div>
    </Portal>
  )
}

interface MenuItemProps {
  onClick?: (e: React.MouseEvent) => void
  className?: string
  children: ReactNode
}

export const MenuItem = ({ onClick, className, children }: MenuItemProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 ${className ?? ''}`}
  >
    {children}
  </button>
)

export default AnchoredMenu
