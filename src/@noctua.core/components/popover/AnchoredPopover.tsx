import type { ReactNode, CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Portal } from '@mantine/core'

interface AnchoredPopoverProps {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  /** "bottom-start" places below+aligned-left; "bottom-end" places below+aligned-right */
  placement?: 'bottom-start' | 'bottom-end'
}

const AnchoredPopover = ({
  anchorEl,
  open,
  onClose,
  children,
  className,
  placement = 'bottom-start',
}: AnchoredPopoverProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' })

  useLayoutEffect(() => {
    if (!open || !anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    if (placement === 'bottom-end') {
      setStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    } else {
      setStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
      })
    }
  }, [open, anchorEl, placement])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (ref.current?.contains(target)) return
      if (anchorEl?.contains(target)) return
      // Don't close when clicking inside any portaled overlay (Select dropdowns,
      // Combobox, Menus, Modals, Tooltips). Mantine portals their children to
      // body and tags interactive surfaces with these roles/attributes.
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
        className={`z-[1300] rounded-md border border-gray-200 bg-white shadow-lg ${className ?? ''}`}
        style={style}
      >
        {children}
      </div>
    </Portal>
  )
}

export default AnchoredPopover
