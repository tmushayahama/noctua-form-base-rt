import type { Action, Middleware, ThunkAction } from '@reduxjs/toolkit'
import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import apiService from './apiService'
import { drawerSlice } from '@/@noctua.core/components/drawer/drawerSlice'
import { searchSlice } from '@/features/search/searchSlice'
import { camSlice } from '@/features/gocam/slices/camSlice'
import { activityFormSlice } from '@/features/gocam/slices/activityFormSlice'
import { metadataSlice } from '@/features/users/slices/metadataSlice'
import { authSlice } from '@/features/auth/slices/authSlice'
import { relationSlice } from '@/features/relations/slices/relationSlice'
import { dialogSlice } from '@/@noctua.core/components/dialog/dialogSlice'

const rootReducer = combineSlices({
  auth: authSlice.reducer,
  metadata: metadataSlice.reducer,
  activityForm: activityFormSlice.reducer,
  cam: camSlice.reducer,
  relation: relationSlice.reducer,
  search: searchSlice.reducer,
  drawer: drawerSlice.reducer,
  dialog: dialogSlice.reducer,
  [apiService.reducerPath]: apiService.reducer,
})

const middlewares: Middleware[] = [apiService.middleware]
export type RootState = ReturnType<typeof rootReducer>

export const makeStore = (preloadedState?: Partial<RootState>) => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware => {
      return getDefaultMiddleware().concat(middlewares)
    },
    preloadedState,
  })
  setupListeners(store.dispatch)
  return store
}

export const store = makeStore()

export type AppStore = typeof store
export type AppDispatch = AppStore['dispatch']
export type AppThunk<ThunkReturnType = void> = ThunkAction<
  ThunkReturnType,
  RootState,
  unknown,
  Action
>
