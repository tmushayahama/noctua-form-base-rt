import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store/store'

export type RightPanelTab = 'activityTable' | 'camErrors'

interface DrawerState {
  leftDrawerOpen: boolean
  rightDrawerOpen: boolean
  rightPanelTab: RightPanelTab
}

const initialState: DrawerState = {
  leftDrawerOpen: false,
  rightDrawerOpen: false,
  rightPanelTab: 'activityTable',
}

export const drawerSlice = createSlice({
  name: 'drawer',
  initialState,
  reducers: {
    setLeftDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.leftDrawerOpen = action.payload
    },
    setRightDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.rightDrawerOpen = action.payload
    },
    toggleLeftDrawer: state => {
      state.leftDrawerOpen = !state.leftDrawerOpen
    },
    toggleRightDrawer: state => {
      state.rightDrawerOpen = !state.rightDrawerOpen
    },
    setRightPanelTab: (state, action: PayloadAction<RightPanelTab>) => {
      state.rightPanelTab = action.payload
    },
  },
})

export const {
  setLeftDrawerOpen,
  setRightDrawerOpen,
  toggleLeftDrawer,
  toggleRightDrawer,
  setRightPanelTab,
} = drawerSlice.actions

export const selectLeftDrawerOpen = (state: RootState) => state.drawer.leftDrawerOpen
export const selectRightDrawerOpen = (state: RootState) => state.drawer.rightDrawerOpen
export const selectRightPanelTab = (state: RootState) => state.drawer.rightPanelTab

export default drawerSlice.reducer
