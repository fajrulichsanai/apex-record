'use client';

import Select from 'react-select';
import './CustomSelect.css';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

const customStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '40px',
    border: state.isFocused ? '1.5px solid #4F7EF8' : state.selectOption?.error ? '1.5px solid #FF4D4F' : '1.5px solid #E8ECF4',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(79, 126, 248, 0.12)' : 'none',
    cursor: 'pointer',
    fontSize: '13.5px',
    fontFamily: 'inherit',
    color: '#1A2340',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      borderColor: !state.isDisabled ? '#4F7EF8' : 'inherit',
    },
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '8px',
    boxShadow: '0 6px 20px rgba(15, 23, 42, 0.12)',
    border: '1px solid #E8ECF4',
    zIndex: 9999,
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#EBF1FF' : state.isFocused ? '#F5F6FA' : 'transparent',
    color: state.isSelected ? '#4F7EF8' : '#1A2340',
    cursor: 'pointer',
    fontWeight: state.isSelected ? 600 : 400,
    fontSize: '13.5px',
    padding: '10px 12px',
    '&:active': {
      backgroundColor: '#EBF1FF',
    },
  }),
  singleValue: (base: any) => ({
    ...base,
    color: '#1A2340',
    fontSize: '13.5px',
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#A0AEC0',
    fontSize: '13.5px',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base: any) => ({
    ...base,
    color: '#A0AEC0',
    padding: '4px 8px',
    fontSize: '18px',
  }),
};

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
        ...customStyles,
        menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
      }}
    />
  );
}
