import { useCallback, useState } from 'react'
import { Button, Checkbox, TextInput } from '@mantine/core'
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
    <div className="flex flex-col gap-3 px-4 py-3">
      <TextInput
        label="New Model Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        size="xs"
        autoFocus
      />

      <Checkbox
        checked={preserveEvidence}
        onChange={e => setPreserveEvidence(e.target.checked)}
        size="sm"
        label="Include evidence"
      />

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="xs"
          onClick={() => dispatch(closeDialog())}
        >
          Cancel
        </Button>
        <Button
          variant="filled"
          size="xs"
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
