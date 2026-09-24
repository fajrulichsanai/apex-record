'use client';

import { useState } from 'react';
import CustomSelect from './CustomSelect';

const CUSTOM_VALUE = '__custom__';

interface ExamFindingSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
}

/**
 * A standardized-finding picker for physical exam fields: tap a common
 * clinical finding from the dropdown, or fall back to "Lainnya (isi manual)"
 * to type something not on the list. `forcedManual` only covers the one
 * case the value itself can't express — the user just picked "Lainnya" on a
 * field that's still empty or still holding a preset string; any value that
 * doesn't match a preset already implies manual mode without needing state.
 */
export default function ExamFindingSelect({ value, onChange, options, disabled }: ExamFindingSelectProps) {
  const [forcedManual, setForcedManual] = useState(false);
  const manualMode = forcedManual || (value !== '' && !options.includes(value));

  const selectOptions = [...options.map((opt) => ({ value: opt, label: opt })), { value: CUSTOM_VALUE, label: 'Lainnya (isi manual)' }];
  const selectValue = manualMode ? CUSTOM_VALUE : value;

  return (
    <>
      <CustomSelect
        value={selectValue}
        options={selectOptions}
        placeholder="— Pilih —"
        disabled={disabled}
        onChange={(v) => {
          if (v === CUSTOM_VALUE) {
            setForcedManual(true);
          } else {
            setForcedManual(false);
            onChange(v);
          }
        }}
      />
      {manualMode && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tulis temuan manual…"
          disabled={disabled}
          style={{ marginTop: 8 }}
        />
      )}
    </>
  );
}
