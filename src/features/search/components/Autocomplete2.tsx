import type React from 'react'
import type { KeyboardEvent } from 'react'
import { useState, useEffect, useRef } from 'react'
import { FiFile } from 'react-icons/fi'
import { FaFileMedical } from 'react-icons/fa'
import { useSearchTermsQuery } from '../slices/lookupApiSlice'
import type { GOlrResponse } from '../models/search'
import { AutocompleteType } from '../models/search'
import { TextField, Popper, Paper, CircularProgress } from '@mui/material'

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
  onOpenReference?: (event: React.MouseEvent) => void
  onOpenTermDetails?: (event: React.MouseEvent, item: GOlrResponse) => void
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
  onOpenReference,
  onOpenTermDetails,
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
      skip: !useAutocomplete || !debouncedSearchTerm || debouncedSearchTerm.length < 3,
      selectFromResult: ({ data, isLoading, isFetching }) => ({
        data: data || [],
        isLoading,
        isFetching,
      }),
    }
  )

  useEffect(() => {
    if (useAutocomplete && data && data.length > 0) {
      setOptions(data)
      setHighlightedIndex(-1)
    }
  }, [data, useAutocomplete])

  useEffect(() => {
    if (!useAutocomplete) return

    const handler = setTimeout(() => {
      setDebouncedSearchTerm(inputValue)
    }, 300)

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
      element.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  if (!useAutocomplete) {
    return (
      <TextField
        id={`textarea-${name}`}
        name={name}
        label={label}
        size="small"
        variant={variant}
        disabled={disabled}
        multiline
        rows={2}
        value={typeof value === 'string' ? value : ''}
        onChange={e => onChange(e.target.value)}
        onBlur={e => {
          const trimmed = e.target.value.trim()
          if (trimmed !== e.target.value) onChange(trimmed)
          onBlur?.()
        }}
        fullWidth
        InputProps={{
          className: 'bg-white rounded',
          endAdornment: autocompleteType === AutocompleteType.REFERENCE && onOpenReference && (
            <button
              onClick={e => onOpenReference(e)}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <FaFileMedical />
            </button>
          ),
        }}
      />
    )
  }

  const handleOptionSelect = (option: GOlrResponse) => {
    onChange(option)
    setInputValue(option.id ? `${option.label} (${option.id})` : option.label)
    setOpen(false)
    setHighlightedIndex(-1)
  }

  return (
    <div className="w-full">
      <div ref={anchorRef} onKeyDown={handleKeyDown}>
        <TextField
          id={`autocomplete-${name}`}
          name={name}
          label={label}
          size="small"
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => useAutocomplete && !inputValue && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          disabled={disabled}
          variant={variant}
          multiline
          rows={2}
          fullWidth
          InputProps={{
            className: 'bg-white rounded',
            endAdornment: (isLoading || isFetching) && <CircularProgress size={20} />,
          }}
        />
      </div>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        style={{ width: Math.max(anchorRef.current?.clientWidth || 0, 400), zIndex: 1300 }}
      >
        <Paper className="mt-1 max-h-60 overflow-y-auto !bg-amber-100" ref={listRef}>
          {options.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              {inputValue.length < 3 ? 'Type at least 3 characters to search' : 'No results found'}
            </div>
          )}

          {options.map((option, index) => (
            <div
              key={option.id}
              className={`flex cursor-pointer items-center justify-between gap-4 p-3 text-xs ${option.isObsolete ? 'pointer-events-none line-through opacity-40' : ''} ${index === highlightedIndex ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
              onClick={() => !option.isObsolete && handleOptionSelect(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="line-clamp-2 flex-grow font-normal">{option.label}</div>
              {autocompleteType === AutocompleteType.EVIDENCE_CODE && option.xref && (
                <div className="mr-2 font-bold">{option.xref}</div>
              )}
              <div className="shrink-0 text-gray-500">
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
                  className="rounded-full border p-1 hover:bg-gray-200"
                  onClick={e => {
                    e.stopPropagation()
                    onOpenTermDetails(e, option)
                  }}
                >
                  {' '}
                  <FiFile className="ml-1" />
                </button>
              )}
            </div>
          ))}
        </Paper>
      </Popper>
    </div>
  )
}

export default TermAutocomplete
