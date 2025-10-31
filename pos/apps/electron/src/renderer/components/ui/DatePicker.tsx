import React, { useState, useRef, useEffect } from 'react';
import { Button } from './primitives';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  'data-testid'?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  className = '',
  id,
  'data-testid': dataTestId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date().toISOString().split('T')[0]);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      setTempDate(value);
    }
  }, [value]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleApply = () => {
    onChange(tempDate);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempDate(value || new Date().toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const formatDisplayDate = (date: string) => {
    if (!date) return 'Select date';
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempDate(e.target.value);
  };

  return (
    <div className="relative" ref={pickerRef}>
      {/* Input Display */}
      <button
        type="button"
        id={id}
        data-testid={dataTestId}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-9 w-full rounded-md border border-slate-600 bg-slate-900/50 px-3 py-1 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 cursor-pointer items-center justify-between ${className}`}
      >
        <span>{formatDisplayDate(value)}</span>
        <svg
          className="w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {/* Dropdown Picker */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4">
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-2">Select Date</label>
            <input
              ref={inputRef}
              type="date"
              value={tempDate}
              onChange={handleDateChange}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 [color-scheme:dark]"
            />
          </div>

          {/* Preview */}
          <div className="text-center text-slate-300 text-base font-semibold mb-4">
            {formatDisplayDate(tempDate)}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleApply}
              className="flex-1"
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
