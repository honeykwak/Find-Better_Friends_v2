'use client'

import React from 'react'

interface ToggleButtonOption {
  value: string;
  label: string;
}

interface ToggleButtonGroupProps {
  options: ToggleButtonOption[];
  selectedValue: string;
  onChange: (value: string) => void;
}

export default function ToggleButtonGroup({ options, selectedValue, onChange }: ToggleButtonGroupProps) {
  return (
    <div className="flex items-center bg-gray-100 rounded p-[2px] gap-[2px]">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex justify-center items-center px-3 py-1 rounded transition-colors duration-200 ease-in-out ${
            selectedValue === option.value
              ? 'bg-white shadow-sm'
              : 'bg-transparent'
          }`}
        >
          <span
            className={`content-text whitespace-nowrap ${
              selectedValue === option.value
                ? 'text-gray-900'
                : 'text-gray-500'
            }`}
          >
            {option.label}
          </span>
        </button>
      ))}
    </div>
  )
}
