import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { TextField, Paper, CircularProgress } from '@mui/material';
import { FiChevronRight, FiFile } from 'react-icons/fi';
import { useSearchTermsQuery } from '../slices/lookupApiSlice';
import type { GOlrResponse } from '../models/search';
import { AutocompleteType } from '../models/search';

interface TextareaAutocompleteProps {
  label: string;
  name: string;
  rootTypeIds?: string[];
  autocompleteType?: AutocompleteType;
  value: GOlrResponse | null;
  onChange: (value: GOlrResponse | null) => void;
  onBlur?: () => void;
  disabled?: boolean;
  variant?: 'standard' | 'outlined' | 'filled';
  onOpenReference?: (event: React.MouseEvent) => void;
  onOpenTermDetails?: (event: React.MouseEvent, item: GOlrResponse) => void;
}

const TextareaAutocomplete: React.FC<TextareaAutocompleteProps> = ({
  label = '',
  name,
  rootTypeIds = [],
  autocompleteType = AutocompleteType.TERM,
  value,
  onChange,
  onBlur,
  disabled = false,
  variant = 'filled',
  onOpenReference,
  onOpenTermDetails
}) => {
  const [inputValue, setInputValue] = useState<string>(value?.label || '');
  const [options, setOptions] = useState<GOlrResponse[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Use RTK Query hook
  const { data, isLoading, isFetching } = useSearchTermsQuery(
    { searchText: debouncedSearchTerm, closureIds: rootTypeIds },
    {
      skip: !debouncedSearchTerm || debouncedSearchTerm.length < 3,
      selectFromResult: ({ data, isLoading, isFetching }) => ({
        data: data || [],
        isLoading,
        isFetching
      })
    }
  );

  // Update options when data changes
  useEffect(() => {
    if (data && data.length > 0) {
      setOptions(data);
      if (data.length > 0) {
        setIsOpen(true);
      }
    }
  }, [data]);

  // Handle debounced search with native setTimeout
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue.trim().length >= 3) {
        setDebouncedSearchTerm(inputValue);
      } else {
        setOptions([]);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to highlighted option
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const highlightedOption = listboxRef.current.children[highlightedIndex] as HTMLLIElement;
      if (highlightedOption) {
        highlightedOption.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value === '') {
      onChange(null);
    }
  };

  const handleOptionClick = (option: GOlrResponse) => {
    setInputValue(option.label);
    onChange(option);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) {
      if ((e.key === 'ArrowDown' || e.key === 'Enter') && inputValue.length >= 3) {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleOptionClick(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full" data-pw={`form-input-${name}`}>
      <div className="relative">
        <TextField
          ref={inputRef}
          id={`textarea-${name}`}
          name={name}
          label={label}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.length >= 3) {
              setIsOpen(true);
            }
          }}
          onBlur={onBlur}
          disabled={disabled}
          variant={variant}
          multiline
          rows={3}
          fullWidth
          InputProps={{
            className: "bg-white rounded",
            endAdornment: (
              isLoading || isFetching ? (
                <CircularProgress color="inherit" size={20} />
              ) : null
            ),
          }}
          InputLabelProps={{
            shrink: true,
          }}
          className="w-full"
          aria-autocomplete="list"
          aria-controls={isOpen ? `listbox-${name}` : undefined}
          aria-expanded={isOpen}
          aria-activedescendant={
            highlightedIndex >= 0 ? `option-${name}-${options[highlightedIndex]?.id}` : undefined
          }
        />
      </div>

      {isOpen && options.length > 0 && (
        <Paper
          elevation={8}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md shadow-lg"
        >
          <ul
            id={`listbox-${name}`}
            ref={listboxRef}
            role="listbox"
            className="py-1 divide-y divide-gray-100"
          >
            {options.map((option, index) => (
              <li
                key={option.id}
                id={`option-${name}-${option.id}`}
                role="option"
                aria-selected={highlightedIndex === index}
                className={`cursor-pointer select-none relative py-2 px-3 ${highlightedIndex === index ? 'bg-blue-50' : ''
                  } ${!option.notAnnotatable ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => option.notAnnotatable && handleOptionClick(option)}
              >
                <div className="flex w-full items-center">
                  <div className="flex-grow font-normal truncate max-w-[200px]">
                    {option.label}
                  </div>

                  {autocompleteType === AutocompleteType.EVIDENCE_CODE && option.xref && (
                    <div className="font-bold mr-2">
                      {option.xref}
                    </div>
                  )}

                  <div className="text-sm text-gray-600 flex items-center">
                    {option.link ? (
                      <a
                        href={option.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center"
                      >
                        <span>{option.id}</span>
                        <FiFile className="ml-1" fontSize="small" />
                      </a>
                    ) : (
                      <span>{option.id}</span>
                    )}
                  </div>

                  {onOpenTermDetails && (
                    <button
                      type="button"
                      className="ml-2 p-1 rounded-full border border-gray-300 hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTermDetails(e, option);
                      }}
                    >
                      <FiChevronRight fontSize="small" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Paper>
      )}

      {isOpen && options.length === 0 && debouncedSearchTerm.length >= 3 && !isLoading && !isFetching && (
        <Paper
          elevation={8}
          className="absolute z-10 mt-1 w-full py-2 px-3 rounded-md shadow-lg"
        >
          No results found
        </Paper>
      )}

      {isOpen && inputValue.length < 3 && (
        <Paper
          elevation={8}
          className="absolute z-10 mt-1 w-full py-2 px-3 rounded-md shadow-lg"
        >
          Type at least 3 characters to search
        </Paper>
      )}
    </div>
  );
};

export default TextareaAutocomplete;