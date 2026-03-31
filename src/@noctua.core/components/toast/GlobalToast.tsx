import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import type { RootState } from '@/app/store/store'
import { hideToast } from './toastSlice'

const GlobalToast: React.FC = () => {
  const dispatch = useAppDispatch()
  const { open, message, severity, duration } = useAppSelector(
    (state: RootState) => state.toast
  )

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return
    dispatch(hideToast())
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  )
}

export default GlobalToast
