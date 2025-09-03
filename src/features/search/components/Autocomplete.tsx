import type React from 'react';
import { useState, useEffect } from 'react';
import { TextField, Autocomplete, Paper, Button, CircularProgress } from '@mui/material';
import { FiChevronRight, FiFile } from 'react-icons/fi';
import { FaFileMedical } from 'react-icons/fa';
import { useSearchTermsQuery } from '../slices/lookupApiSlice';
import type { GOlrResponse } from '../models/search';
import { AutocompleteType } from '../models/search';

interface TermAutocompleteProps {
  label: string;
  name: string;
  rootTypeIds?: string[];
  autocompleteType?: AutocompleteType;
  value: GOlrResponse | null | string;
  onChange: (value: GOlrResponse | null | string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  variant?: 'standard' | 'outlined' | 'filled';
  onOpenReference?: (event: React.MouseEvent) => void;
  onOpenTermDetails?: (event: React.MouseEvent, item: GOlrResponse) => void;
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
  variant = 'filled',
  onOpenReference,
  onOpenTermDetails
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [open, setOpen] = useState<boolean>(false);
  const [options, setOptions] = useState<GOlrResponse[]>([]);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  // Determine if we should use autocomplete or regular textarea
  const useAutocomplete = autocompleteType === AutocompleteType.TERM ||
    autocompleteType === AutocompleteType.EVIDENCE_CODE;

  // Use RTK Query hook only when using autocomplete
  const { data, isLoading, isFetching } = useSearchTermsQuery(
    { searchText: debouncedSearchTerm, closureIds: rootTypeIds },
    {
      skip: !useAutocomplete || !debouncedSearchTerm || debouncedSearchTerm.length < 3,
      selectFromResult: ({ data, isLoading, isFetching }) => ({
        data: data || [],
        isLoading,
        isFetching
      })
    }
  );

  // Update options when data changes
  useEffect(() => {
    if (useAutocomplete && data && data.length > 0) {
      setOptions(data);
    }
  }, [data, useAutocomplete]);

  // Handle debounced search with native setTimeout
  useEffect(() => {
    if (!useAutocomplete) return;

    const handler = setTimeout(() => {
      setDebouncedSearchTerm(inputValue);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, useAutocomplete]);

  // When the autocomplete opens, initialize with empty search
  useEffect(() => {
    if (!open) {
      setOptions([]);
    }
  }, [open]);

  // Get the display value for different types
  const getOptionLabel = (option: GOlrResponse | string | null): string => {
    if (!option) return '';
    if (typeof option === 'string') {
      return option;
    } else if (option && 'label' in option) {
      return option.label;
    }
    return '';
  };

  // Render option based on autocomplete type
  const renderOption = (props: React.HTMLAttributes<HTMLLIElement>, option: GOlrResponse) => {
    if (autocompleteType === AutocompleteType.TERM ||
      autocompleteType === AutocompleteType.EVIDENCE_CODE) {
      const item = option;

      return (
        <li {...props} key={item.id} className={`${!item.notAnnotatable ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex w-full items-center p-2">
            <div className="flex-grow font-normal truncate max-w-[200px]">
              {item.label}
            </div>

            {autocompleteType === AutocompleteType.EVIDENCE_CODE && (
              <div className="font-bold mr-2">
                {item.xref}
              </div>
            )}

            <div className="text-sm text-gray-600 flex items-center">
              {item.link ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center"
                >
                  <span>{item.id}</span>
                  <FiFile className="ml-1" fontSize="small" />
                </a>
              ) : (
                <span>{item.id}</span>
              )}
            </div>

            {onOpenTermDetails && (
              <Button
                variant="outlined"
                size="small"
                className="ml-2 min-w-[36px] rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTermDetails(e, item);
                }}
              >
                <FiChevronRight fontSize="small" />
              </Button>
            )}
          </div>
        </li>
      );
    } else {
      return (
        <li {...props}>
          <div className="flex w-full items-center py-2">
            <div className="flex-grow">{getOptionLabel(option)}</div>
          </div>
        </li>
      );
    }
  };

  const handleOnFocus = () => {
    if (useAutocomplete && !inputValue) {
      setOpen(true);
    }
  };

  // Handle change for autocomplete
  const handleAutocompleteChange = (_: React.SyntheticEvent, newValue: GOlrResponse | null) => {
    onChange(newValue || null);
  };

  // Handle change for regular textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // If not using autocomplete, render a regular TextField
  if (!useAutocomplete) {
    return (
      <div className="w-full">
        <TextField
          id={`textarea-${name}`}
          name={name}
          label={label}
          variant={variant}
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={handleTextareaChange}
          onBlur={onBlur}
          multiline
          rows={2}
          fullWidth
          InputProps={{
            className: "bg-white rounded",
            endAdornment: (
              <>
                {autocompleteType === AutocompleteType.REFERENCE && onOpenReference && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenReference(e);
                    }}
                    className="min-w-0 p-2"
                  >
                    <FaFileMedical />
                  </Button>
                )}
              </>
            ),
          }}
        />
      </div>
    );
  }

  // Otherwise render the autocomplete component
  return (
    <div className="w-full">
      <Autocomplete
        id={`autocomplete-${name}`}
        freeSolo
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={options}
        loading={isLoading || isFetching}
        value={typeof value === 'object' ? value : null}
        onChange={handleAutocompleteChange}
        onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
        getOptionLabel={getOptionLabel as (option: any) => string}
        isOptionEqualToValue={(option, value) => {
          if (!option || !value) return false;
          return option.id === value.id;
        }}
        disabled={disabled}
        renderOption={renderOption as any}
        filterOptions={(x) => x} // Disable built-in filtering as we're using server-side filtering
        renderInput={(params) => (
          <TextField
            {...params}
            name={name}
            label={label}
            variant={variant}
            onBlur={onBlur}
            onFocus={handleOnFocus}
            multiline
            rows={2}
            InputProps={{
              ...params.InputProps,
              className: "bg-white rounded",
              endAdornment: (
                <>
                  {isLoading || isFetching ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        PaperComponent={(props) => (
          <Paper {...props} elevation={8} className="max-w-md shadow-lg" />
        )}
        noOptionsText={inputValue.length < 3 ? "Type at least 3 characters to search" : "No results found"}
        ListboxProps={{
          className: "max-h-60 overflow-y-auto"
        }}
      />
    </div>
  );
};

export default TermAutocomplete;