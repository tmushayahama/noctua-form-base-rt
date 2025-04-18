import type { Action, Middleware, ThunkAction } from '@reduxjs/toolkit'
import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import apiService from './apiService'
import { drawerSlice } from '@/@pango.core/components/drawer/drawerSlice'
import { annotationSlice } from '@/features/annotations/slices/annotationsSlice'
import { selectedAnnotationSlice } from '@/features/annotations/slices/selectedAnnotationSlice'
import { geneSlice } from '@/features/genes/slices/genesSlice'
import { searchSlice } from '@/features/search/searchSlice'
import { termsSlice } from '@/features/terms/slices/termsSlice'
import { camSlice } from '@/features/gocam/slices/camSlice'
import { activityFormSlice } from '@/features/gocam/slices/activityFormSlice'
import { metadataSlice } from '@/features/users/slices/metadataSlice'
import { authSlice } from '@/features/auth/slices/authSlice'
import { relationSlice } from '@/features/relations/slices/relationSlice'
import { dialogSlice } from '@/@pango.core/components/dialog/dialogSlice'

const rootReducer = combineSlices({
  auth: authSlice.reducer,
  metadata: metadataSlice.reducer,
  activityForm: activityFormSlice.reducer,
  cam: camSlice.reducer,
  relation: relationSlice.reducer,
  search: searchSlice.reducer,
  genes: geneSlice.reducer,
  terms: termsSlice.reducer,
  annotations: annotationSlice.reducer,
  selectedAnnotation: selectedAnnotationSlice.reducer,
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
