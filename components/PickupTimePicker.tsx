'use client';

import { useEffect, useRef } from 'react';

const ROW_HEIGHT = 40;

interface WheelColumnProps {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}

function WheelColumn({ label, values, selected, onSelect }: WheelColumnProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<number | null>(null);

  useEffect(() => {
    if (scrollTimer.current !== null) {
      window.clearTimeout(scrollTimer.current);
      scrollTimer.current = null;
    }
    const index = values.indexOf(selected);
    if (wheelRef.current && index >= 0) {
      wheelRef.current.scrollTop = index * ROW_HEIGHT;
    }
  }, [selected, values]);

  useEffect(
    () => () => {
      if (scrollTimer.current !== null) window.clearTimeout(scrollTimer.current);
    },
    []
  );

  if (values.length === 0) return null;

  return (
    <div className="relative min-w-0 flex-1">
      <p className="mb-1 text-center text-xs font-semibold text-stone-500">{label}</p>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-10 z-10 h-10 rounded-xl border-y border-orange-200 bg-orange-50/70"
        />
        <div
          ref={wheelRef}
          role="listbox"
          aria-label={label}
          className="h-[120px] snap-y snap-mandatory overflow-y-auto overscroll-contain py-10 [scrollbar-width:none]"
          onScroll={(event) => {
            if (scrollTimer.current !== null) window.clearTimeout(scrollTimer.current);
            const element = event.currentTarget;
            scrollTimer.current = window.setTimeout(() => {
              const index = Math.max(
                0,
                Math.min(values.length - 1, Math.round(element.scrollTop / ROW_HEIGHT))
              );
              onSelect(values[index]);
            }, 70);
          }}
        >
          {values.map((value) => (
            <button
              key={value}
              type="button"
              role="option"
              aria-selected={value === selected}
              onClick={() => onSelect(value)}
              className={`flex h-10 w-full snap-center items-center justify-center font-mono text-lg font-bold tabular-nums ${
                value === selected ? 'text-red-700' : 'text-stone-400'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PickupTimePickerProps {
  slots: string[];
  value: string;
  onChange: (value: string) => void;
}

export function PickupTimePicker({ slots, value, onChange }: PickupTimePickerProps) {
  const selectedSlot = slots.includes(value) ? value : slots[0] ?? '';
  const selectedHour = selectedSlot.split(':')[0] ?? '';
  const selectedMinute = selectedSlot.split(':')[1] ?? '';
  const hours = [...new Set(slots.map((slot) => slot.split(':')[0]))];
  const minutes = slots
    .filter((slot) => slot.startsWith(`${selectedHour}:`))
    .map((slot) => slot.split(':')[1]);

  useEffect(() => {
    if (selectedSlot && selectedSlot !== value) onChange(selectedSlot);
  }, [selectedSlot, value, onChange]);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-xs gap-4">
        <WheelColumn
          label="Jam"
          values={hours}
          selected={selectedHour}
          onSelect={(hour) => {
            const nextSlot = slots.find((slot) => slot.startsWith(`${hour}:`));
            if (nextSlot) onChange(nextSlot);
          }}
        />
        <span className="mt-8 font-mono text-xl font-bold text-stone-400">:</span>
        <WheelColumn
          label="Menit"
          values={minutes}
          selected={selectedMinute}
          onSelect={(minute) => onChange(`${selectedHour}:${minute}`)}
        />
      </div>
      <p className="mt-2 text-center text-xs font-medium text-stone-500">
        Geser roda atau ketuk pilihan waktu
      </p>
    </div>
  );
}
