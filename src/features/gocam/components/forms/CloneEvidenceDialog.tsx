import type React from 'react'
import { useState } from 'react'
import { Modal, Button, Checkbox } from '@mantine/core'
import { resolveModalSize } from '@/@noctua.core/components/dialog/modalSize'
import DialogHeader from '@/@noctua.core/components/dialog/DialogHeader'
import type { Evidence } from '../../models/cam'

interface CloneEvidenceDialogProps {
  open: boolean
  evidences: Evidence[]
  onClose: () => void
  onSelect: (selected: Evidence[]) => void
}

const CloneEvidenceDialog: React.FC<CloneEvidenceDialogProps> = ({
  open,
  evidences,
  onClose,
  onSelect,
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const handleToggle = (uid: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(uid)) {
        next.delete(uid)
      } else {
        next.add(uid)
      }
      return next
    })
  }

  const handleToggleAll = () => {
    if (selected.size === evidences.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(evidences.map(e => e.uid)))
    }
  }

  const handleSave = () => {
    const selectedEvidences = evidences.filter(e => selected.has(e.uid))
    onSelect(selectedEvidences)
    setSelected(new Set())
    onClose()
  }

  return (
    <Modal opened={open} onClose={onClose} size={resolveModalSize('md')}>
      <DialogHeader title="Clone Evidence" onClose={onClose} />
      <div className="px-4 py-3">
        {evidences.length === 0 ? (
          <div className="py-4 text-center text-gray-500">
            No evidence available in this activity
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center border-b border-gray-300 bg-gray-50 py-2 font-medium text-gray-700">
              <div className="w-10">
                <Checkbox
                  checked={selected.size === evidences.length && evidences.length > 0}
                  indeterminate={
                    selected.size > 0 && selected.size < evidences.length
                  }
                  onChange={handleToggleAll}
                />
              </div>
              <div className="flex-1">Evidence Code</div>
              <div className="flex-1">Reference</div>
              <div className="flex-1">With</div>
              <div className="flex-1">Assigned By</div>
            </div>

            {/* Rows */}
            <div className="max-h-[50vh] overflow-y-auto">
              {evidences.map(ev => (
                <div
                  key={ev.uid}
                  className="flex cursor-pointer items-center border-b border-gray-200 py-2 hover:bg-gray-50"
                  onClick={() => handleToggle(ev.uid)}
                >
                  <div className="w-10">
                    <Checkbox
                      checked={selected.has(ev.uid)}
                      onChange={e => {
                        e.stopPropagation()
                        handleToggle(ev.uid)
                      }}
                    />
                  </div>
                  <div className="flex-1 truncate text-sm">
                    {ev.evidenceCode.label || ev.evidenceCode.id}
                  </div>
                  <div className="flex-1 truncate text-sm">{ev.reference}</div>
                  <div className="flex-1 truncate text-sm">{ev.with}</div>
                  <div className="flex-1 truncate text-sm">
                    {ev.groups?.map(g => g.label).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          variant="filled"
          onClick={handleSave}
          disabled={selected.size === 0}
        >
          Use Selected ({selected.size})
        </Button>
      </div>
    </Modal>
  )
}

export default CloneEvidenceDialog
