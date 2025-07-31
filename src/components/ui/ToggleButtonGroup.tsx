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
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-2 py-1 content-text font-medium rounded-md whitespace-nowrap ${
            selectedValue === option.value
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:bg-gray-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
