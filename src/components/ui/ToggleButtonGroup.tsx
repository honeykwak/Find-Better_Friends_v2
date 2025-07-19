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
    <div className="flex bg-gray-100 rounded-lg p-0.5">
      {options.map(option => (
        <button 
          key={option.value}
          onClick={() => onChange(option.value)} 
          className={`flex-1 px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap ${selectedValue === option.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
