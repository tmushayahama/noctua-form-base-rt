import { useCallback, useState } from 'react'
import {
  Button,
  TextField,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material'
import { FiPlus, FiX } from 'react-icons/fi'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import type { RootState } from '@/app/store/store'
import { useUpdateGraphModelMutation } from '../slices/camApiSlice'
import { buildSaveModelAnnotationsOperations } from '../services/activityOperations'
import { closeDialog } from '@/@noctua.core/components/dialog/dialogSlice'

const MODEL_STATES = ['development', 'production', 'review', 'closed', 'delete']

const CamMetadataForm: React.FC = () => {
  const dispatch = useAppDispatch()
  const cam = useAppSelector((state: RootState) => state.cam.model)
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
    <div className="flex flex-col gap-4 p-2">
      <TextField
        label="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        size="small"
        fullWidth
      />

      <Select
        value={state}
        onChange={e => setState(e.target.value)}
        size="small"
        fullWidth
      >
        {MODEL_STATES.map(s => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </Select>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">Comments</span>
          <IconButton size="small" onClick={handleAddComment}>
            <FiPlus size={14} />
          </IconButton>
        </div>
        {comments.map((comment, i) => (
          <div key={i} className="flex items-center gap-1 mb-1">
            <TextField
              value={comment}
              onChange={e => handleCommentChange(i, e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={1}
              maxRows={3}
            />
            <IconButton size="small" onClick={() => handleRemoveComment(i)}>
              <FiX size={14} />
            </IconButton>
          </div>
        ))}
      </div>

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
