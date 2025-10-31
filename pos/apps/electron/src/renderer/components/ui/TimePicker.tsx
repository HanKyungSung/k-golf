import React, { useState, useRef, useEffect } from 'react';
import { Button } from './primitives';

interface TimePickerProps {
  value: string; // HH:MM format
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  'data-testid'?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  className = '',
  id,
  'data-testid': dataTestId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempTime, setTempTime] = useState(value || '09:00');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const [hours, minutes] = (value || '09:00').split(':');

  useEffect(() => {
    if (value) {
      setTempTime(value);
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
    onChange(tempTime);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempTime(value || '09:00');
    setIsOpen(false);
  };

  const formatDisplayTime = (time: string) => {
    if (!time) return '--:--';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m} ${period}`;
  };

  // Generate hour options (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    const displayHour = i === 0 ? 12 : i > 12 ? i - 12 : i;
    const period = i >= 12 ? 'PM' : 'AM';
    return { value: hour, label: `${displayHour} ${period}` };
  });

  // Generate minute options (0-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => {
    const minute = i.toString().padStart(2, '0');
    return { value: minute, label: minute };
  });

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
        <span>{formatDisplayTime(value)}</span>
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* Dropdown Picker */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4">
          <div className="flex gap-3 mb-4">
            {/* Hour Selector */}
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Hour</label>
              <select
                value={tempTime.split(':')[0]}
                onChange={(e) => {
                  const [, m] = tempTime.split(':');
                  setTempTime(`${e.target.value}:${m}`);
                }}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {hourOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Minute Selector */}
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Minute</label>
              <select
                value={tempTime.split(':')[1]}
                onChange={(e) => {
                  const [h] = tempTime.split(':');
                  setTempTime(`${h}:${e.target.value}`);
                }}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {minuteOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="text-center text-slate-300 text-lg font-semibold mb-4">
            {formatDisplayTime(tempTime)}
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
