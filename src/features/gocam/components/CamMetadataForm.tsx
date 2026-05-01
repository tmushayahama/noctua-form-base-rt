import { useCallback, useState } from 'react'
import { ActionIcon, Button, Select, TextInput, Textarea } from '@mantine/core'
import { FiPlus, FiX } from 'react-icons/fi'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { useUpdateGraphModelMutation } from '../slices/camApiSlice'
import { buildSaveModelAnnotationsOperations } from '../services/activityOperations'
import { closeDialog } from '@/@noctua.core/components/dialog/dialogSlice'
import { MODEL_STATES } from '../data/camConstants'

const CamMetadataForm: React.FC = () => {
  const dispatch = useAppDispatch()
  const cam = useAppSelector(selectCamModel)
  const [updateGraphModel, { isLoading }] = useUpdateGraphModelMutation()

  const [title, setTitle] = useState(cam?.title ?? '')
  const [state, setState] = useState(cam?.state ?? 'development')
  const [comments, setComments] = useState<string[]>(cam?.comments ?? [])

  const handleAddComment = useCallback(() => {
    setComments(prev => [...prev, ''])
  }, [])

  const handleRemoveComment = useCallback((index: number) => {
    setComments(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleCommentChange = useCallback((index: number, value: string) => {
    setComments(prev => prev.map((c, i) => (i === index ? value : c)))
  }, [])

  const handleSave = useCallback(async () => {
    if (!cam?.id) return

    const filteredComments = comments.filter(c => c.trim())

    const ops = buildSaveModelAnnotationsOperations(
      cam.id,
      { title: cam.title, state: cam.state, comments: cam.comments },
      { title, state, comments: filteredComments }
    )

    await updateGraphModel(ops)
    dispatch(closeDialog())
  }, [cam, title, state, comments, updateGraphModel, dispatch])

  if (!cam) return null

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <TextInput
        label="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        size="xs"
      />

      <Select
        value={state}
        onChange={value => value && setState(value)}
        size="xs"
        data={MODEL_STATES.map(s => ({ value: s, label: s }))}
      />

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">Comments</span>
          <ActionIcon variant="subtle" color="gray" size="md" onClick={handleAddComment}>
            <FiPlus size={14} />
          </ActionIcon>
        </div>
        {comments.map((comment, i) => (
          <div key={i} className="flex items-center gap-1 mb-1">
            <Textarea
              value={comment}
              onChange={e => handleCommentChange(i, e.target.value)}
              size="xs"
              autosize
              minRows={1}
              maxRows={3}
              className="flex-1"
            />
            <ActionIcon variant="subtle" color="gray" size="md" onClick={() => handleRemoveComment(i)}>
              <FiX size={14} />
            </ActionIcon>
          </div>
        ))}
      </div>

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
          onClick={handleSave}
          disabled={isLoading || !title.trim()}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export default CamMetadataForm
