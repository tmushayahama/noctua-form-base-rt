import { useCallback, useState } from 'react'
import {
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { useCopyGraphModelMutation } from '../slices/camApiSlice'
import { closeDialog } from '@/@noctua.core/components/dialog/dialogSlice'

const CopyModelDialog: React.FC = () => {
  const dispatch = useAppDispatch()
  const cam = useAppSelector(selectCamModel)
  const [copyModel, { isLoading }] = useCopyGraphModelMutation()

  const [title, setTitle] = useState(cam?.title ? `Copy of ${cam.title}` : '')
  const [preserveEvidence, setPreserveEvidence] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!cam?.id || !title.trim()) return

    const result = await copyModel({
      modelId: cam.id,
      title: title.trim(),
      preserveEvidence,
    }).unwrap()

    dispatch(closeDialog())

    if (result?.newModelId) {
      const url = new URL(window.location.href)
      url.searchParams.set('model_id', result.newModelId)
      window.open(url.toString(), '_blank')
    }
  }, [cam, title, preserveEvidence, copyModel, dispatch])

  if (!cam) return null

  return (
    <div className="flex flex-col gap-4 p-2">
      <TextField
        label="New Model Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        size="small"
        fullWidth
        autoFocus
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={preserveEvidence}
            onChange={e => setPreserveEvidence(e.target.checked)}
            size="small"
          />
        }
        label="Include evidence"
      />

      <div className="flex justify-end gap-2">
        <Button
          variant="outlined"
          size="small"
          onClick={() => dispatch(closeDialog())}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleCopy}
          disabled={isLoading || !title.trim()}
        >
          {isLoading ? 'Copying...' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

export default CopyModelDialog
