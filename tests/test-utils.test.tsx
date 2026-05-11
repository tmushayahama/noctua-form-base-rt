import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { useAppSelector } from '@/app/hooks'
import { setModel, setSelectedActivity } from '@/features/gocam/slices/camSlice'
import { renderWithProviders } from '@tests/test-utils'
import { swissOneModel } from '@tests/fixtures/models'

const ModelIdProbe = () => {
  const id = useAppSelector(s => s.cam.model?.id ?? 'empty')
  return <span data-testid="model-id">{id}</span>
}

const SelectedActivityProbe = () => {
  const selected = useAppSelector(s => s.cam.selectedActivityId ?? 'none')
  return <span data-testid="selected">{selected}</span>
}

describe('renderWithProviders', () => {
  it('honors preloadedState through the Provider', () => {
    const { getByTestId } = renderWithProviders(<ModelIdProbe />, {
      preloadedState: {
        cam: {
          model: swissOneModel,
          loading: false,
          error: null,
          selectedActivityId: null,
        },
      },
    })
    expect(getByTestId('model-id').textContent).toBe(swissOneModel.id)
  })

  it('returns a store whose dispatches update connected components', () => {
    const { getByTestId, store } = renderWithProviders(<SelectedActivityProbe />)
    expect(getByTestId('selected').textContent).toBe('none')

    act(() => {
      store.dispatch(setSelectedActivity('act-42'))
    })
    expect(getByTestId('selected').textContent).toBe('act-42')
  })

  it('exposes a configured user-event helper', () => {
    const { user } = renderWithProviders(<ModelIdProbe />)
    expect(typeof user.click).toBe('function')
    expect(typeof user.type).toBe('function')
  })

  it('creates an isolated store per render', () => {
    // Asserting on store.getState rather than DOM — RTL keeps both DOMs mounted
    // until end-of-test cleanup, which would fail any DOM-scoped query here.
    const first = renderWithProviders(<ModelIdProbe />)
    act(() => {
      first.store.dispatch(setModel(swissOneModel))
    })
    expect(first.store.getState().cam.model?.id).toBe(swissOneModel.id)

    const second = renderWithProviders(<ModelIdProbe />)
    expect(second.store.getState().cam.model).toBeNull()
  })
})
