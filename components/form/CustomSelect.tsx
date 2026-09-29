'use client';

import Select, { type StylesConfig } from 'react-select';
import './CustomSelect.css';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

// Colours come from the --cs-* tokens in CustomSelect.css so the control
// and its portalled menu follow the light/dark theme.
type Option = { value: string; label: string };

const buildStyles = (error: boolean): StylesConfig<Option, false> => ({
  control: (base, state) => ({
    ...base,
    minHeight: '40px',
    border: `1px solid ${state.isFocused ? 'var(--cs-accent)' : error ? 'var(--cs-danger)' : 'var(--cs-border)'}`,
    borderRadius: '10px',
    backgroundColor: state.isFocused ? 'var(--cs-surface)' : 'var(--cs-bg)',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(126, 217, 87, 0.22)' : 'none',
    cursor: 'pointer',
    fontSize: '13.5px',
    fontFamily: 'inherit',
    color: 'var(--cs-text)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      borderColor: state.isFocused ? 'var(--cs-accent)' : 'var(--cs-muted)',
    },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '12px',
    backgroundColor: 'var(--cs-surface)',
    boxShadow: 'var(--cs-shadow)',
    border: '1px solid var(--cs-border)',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'var(--cs-accent-soft)' : state.isFocused ? 'var(--cs-hover)' : 'transparent',
    color: state.isSelected ? 'var(--cs-accent-ink)' : 'var(--cs-text)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: state.isSelected ? 600 : 400,
    fontSize: '13.5px',
    padding: '10px 12px',
    '&:active': {
      backgroundColor: 'var(--cs-accent-soft)',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--cs-text)',
    fontSize: '13.5px',
  }),
  input: (base) => ({
    ...base,
    color: 'var(--cs-text)',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--cs-muted)',
    fontSize: '13.5px',
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: 'var(--cs-muted)',
    fontSize: '13px',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'var(--cs-muted)',
    padding: '4px 8px',
    fontSize: '18px',
  }),
});

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi...',
  disabled = false,
  error = false,
}: CustomSelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Select
      isDisabled={disabled}
      options={options}
      value={selectedOption}
      onChange={(opt) => opt && onChange(opt.value)}
      placeholder={placeholder}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      styles={{
        ...buildStyles(error),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      }}
    />
  );
}
