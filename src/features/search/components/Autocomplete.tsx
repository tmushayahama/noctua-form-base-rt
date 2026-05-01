import type React from 'react'
import type { KeyboardEvent } from 'react'
import { useState, useEffect, useRef } from 'react'
import { FiFile } from 'react-icons/fi'
import { useSearchTermsQuery } from '../slices/lookupApiSlice'
import type { GOlrResponse } from '../models/search'
import { AutocompleteType } from '../models/search'
import { Loader, Portal, Textarea } from '@mantine/core'
import { DEBOUNCE_MS, BLUR_CLOSE_DELAY_MS, MIN_SEARCH_LENGTH } from '@/@noctua.core/data/uiConstants'

interface TermAutocompleteProps {
  label: string
  name: string
  rootTypeIds?: string[]
  autocompleteType?: AutocompleteType
  value: GOlrResponse | null | string
  onChange: (value: GOlrResponse | null | string) => void
  onBlur?: () => void
  disabled?: boolean
  variant?: 'standard' | 'outlined' | 'filled'
  onOpenTermDetails?: (event: React.MouseEvent, item: GOlrResponse) => void
  /** Pre-populated options shown on focus before the user types (e.g. terms already used in the model) */
  initialOptions?: GOlrResponse[]
}

const TermAutocomplete: React.FC<TermAutocompleteProps> = ({
  label = '',
  name,
  rootTypeIds = [],
  autocompleteType = AutocompleteType.TERM,
  value,
  onChange,
  onBlur,
  disabled = false,
  variant = 'outlined',
  onOpenTermDetails,
  initialOptions = [],
}) => {
  const [inputValue, setInputValue] = useState<string>('')
  const [open, setOpen] = useState<boolean>(false)
  const [options, setOptions] = useState<GOlrResponse[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')
  const anchorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const useAutocomplete =
    autocompleteType === AutocompleteType.TERM ||
    autocompleteType === AutocompleteType.EVIDENCE_CODE

  const { data, isLoading, isFetching } = useSearchTermsQuery(
    { searchText: debouncedSearchTerm, closureIds: rootTypeIds },
    {
      skip: !useAutocomplete || !debouncedSearchTerm || debouncedSearchTerm.length < MIN_SEARCH_LENGTH,
      selectFromResult: ({ data, isLoading, isFetching }) => ({
        data: data || [],
        isLoading,
        isFetching,
      }),
    }
  )

  const searching = isLoading || isFetching

  useEffect(() => {
    if (useAutocomplete && data && data.length > 0) {
      setOptions(data)
      setHighlightedIndex(-1)
    }
  }, [data, useAutocomplete])

  // Show initialOptions on focus when no search is active
  const showInitial = open && inputValue.length < MIN_SEARCH_LENGTH && options.length === 0 && !searching
  const displayOptions = showInitial ? initialOptions : options

  useEffect(() => {
    if (!useAutocomplete) return

    const handler = setTimeout(() => {
      setDebouncedSearchTerm(inputValue)
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(handler)
    }
  }, [inputValue, useAutocomplete])

  // Sync inputValue with external value prop (e.g., when Redux state changes)
  useEffect(() => {
    if (value && typeof value === 'object' && 'label' in value && value.label) {
      setInputValue(value.id ? `${value.label} (${value.id})` : value.label)
    } else if (value === null) {
      setInputValue('')
    }
  }, [value])

  useEffect(() => {
    if (!open) {
      setOptions([])
      setHighlightedIndex(-1)
    }
  }, [open])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        event.preventDefault()
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1))
        break
      case 'Enter':
        event.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleOptionSelect(options[highlightedIndex])
        }
        break
      case 'Escape':
        setOpen(false)
        break
    }
  }

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const element = listRef.current.children[highlightedIndex] as HTMLElement
      element?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  const handleOptionSelect = (option: GOlrResponse) => {
    onChange(option)
    setInputValue(option.id ? `${option.label} (${option.id})` : option.label)
    setOpen(false)
    setHighlightedIndex(-1)
  }

  return (
    <div className="w-full">
      <div ref={anchorRef} onKeyDown={handleKeyDown}>
        <Textarea
          id={`autocomplete-${name}`}
          name={name}
          label={label}
          size="xs"
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => useAutocomplete && !inputValue && setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), BLUR_CLOSE_DELAY_MS)
            onBlur?.()
          }}
          disabled={disabled}
          rows={2}
          classNames={{ input: 'bg-white rounded' }}
          rightSection={searching ? <Loader size={20} /> : null}
        />
      </div>

      {open && anchorRef.current && (
        <Portal>
          <div
            ref={listRef}
            className="!bg-accent-50 fixed z-[1300] mt-1 max-h-60 w-[400px] overflow-y-auto rounded-md bg-white shadow-lg"
            style={{
              top:
                anchorRef.current.getBoundingClientRect().bottom +
                window.scrollY,
              left:
                anchorRef.current.getBoundingClientRect().left +
                window.scrollX,
            }}
          >
          {!searching && displayOptions.length === 0 && (
            <div className="p-4 text-center text-xs text-gray-500">
              {inputValue.length < MIN_SEARCH_LENGTH
                ? 'Type at least 3 characters to search'
                : 'No results found'}
            </div>
          )}

          {displayOptions.map((option, index) => (
            <div
              key={option.id}
              className={`flex min-h-[40px] cursor-pointer items-center border-b px-4 py-2 text-xs ${option.isObsolete ? 'pointer-events-none line-through opacity-40' : ''} ${index === highlightedIndex ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
              style={{ borderColor: 'rgba(59,89,152,0.3)' }}
              onClick={() => !option.isObsolete && handleOptionSelect(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="min-w-0 shrink font-normal">{option.label}</div>
              <span className="grow" />
              {autocompleteType === AutocompleteType.EVIDENCE_CODE && option.xref && (
                <div className="ml-2 shrink-0 font-bold">{option.xref}</div>
              )}
              <div className="ml-2 shrink-0 text-[10px]" style={{ color: 'rgba(0,0,0,0.6)' }}>
                {option.link ? (
                  <a
                    href={option.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center hover:text-blue-500"
                  >
                    {option.id}
                  </a>
                ) : (
                  <span>{option.id}</span>
                )}
              </div>

              {onOpenTermDetails && (
                <button
                  className="ml-2 shrink-0 rounded-full border p-1 hover:bg-gray-200"
                  onClick={e => {
                    e.stopPropagation()
                    onOpenTermDetails(e, option)
                  }}
                >
                  <FiFile className="ml-1" />
                </button>
              )}
            </div>
          ))}
          </div>
        </Portal>
      )}
    </div>
  )
}

export default TermAutocomplete
