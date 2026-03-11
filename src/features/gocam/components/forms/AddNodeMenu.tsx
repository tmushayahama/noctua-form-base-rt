import type React from 'react'
import { useState } from 'react'
import { Button, Menu, MenuItem, ListItemText } from '@mui/material'
import { FiPlus } from 'react-icons/fi'
import { useAppDispatch } from '@/app/hooks'
import {
  getNodeCategory,
  getExtensionRelations,
  type RelationEntry,
} from '../../data/nodeCategories'
import { addRelationForm } from '../../slices/activityFormSlice'
import type { TermNode } from '../../models/formModels'

interface AddNodeMenuProps {
  parentNode: TermNode
}

const AddNodeMenu: React.FC<AddNodeMenuProps> = ({ parentNode }) => {
  const dispatch = useAppDispatch()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const category = getNodeCategory(parentNode.category)
  const extensionRelations = category ? getExtensionRelations(category) : []

  if (extensionRelations.length === 0) return null

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (entry: RelationEntry) => {
    const targetTypeId = entry.constraint.range[0]
    const targetCategory = getNodeCategory(targetTypeId)

    dispatch(
      addRelationForm({
        parentTermUid: parentNode.uid,
        predicate: entry.constraint.predicate,
        nodeType: targetTypeId,
        label: targetCategory?.label ?? targetTypeId,
        rootTypes: targetCategory?.searchClosureIds ?? [targetTypeId],
        aspect: targetCategory?.aspect ?? null,
      })
    )
    handleClose()
  }

  return (
    <>
      <Button
        size="small"
        variant="text"
        onClick={handleOpen}
        startIcon={<FiPlus />}
        className="!text-xs !normal-case"
      >
        Add
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {extensionRelations.map(entry => {
          const rangeLabels = entry.constraint.range
            .map(id => getNodeCategory(id)?.label ?? id)
            .join(' / ')
          return (
            <MenuItem
              key={`${entry.constraint.predicate.id}-${entry.key}`}
              onClick={() => handleSelect(entry)}
            >
              <ListItemText
                primary={`${entry.constraint.predicate.label} (${rangeLabels})`}
              />
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}

export default AddNodeMenu
