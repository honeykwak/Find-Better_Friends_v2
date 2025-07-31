'use client'

import { useState, useEffect } from 'react'
import Histogram from './Histogram'
import SimpleRangeSlider from './SimpleRangeSlider'

interface DistributionSliderProps {
  min: number
  max: number
  values: [number, number]
  onChange: (values: [number, number]) => void
  step?: number
  formatValue: (value: number) => string
  distributionData?: number[]
}

export default function DistributionSlider({
  min,
  max,
  values: initialValues,
  onChange: onChangeComplete,
  step,
  formatValue,
  distributionData,
}: DistributionSliderProps) {
  const [values, setValues] = useState(initialValues)

  useEffect(() => {
    setValues(initialValues)
  }, [initialValues[0], initialValues[1]])

  return (
    <div className="w-full">
      <div className="flex justify-between items-end text-xs text-gray-600 mb-1">
        <span className="content-text">{formatValue(values[0])}</span>
        <span className="content-text">{formatValue(values[1])}</span>
      </div>
      <Histogram
        distributionData={distributionData}
        min={min}
        max={max}
        values={values}
      />
      <div className="mt-2">
        <SimpleRangeSlider
          min={min}
          max={max}
          values={values}
          onValuesChange={setValues}
          onChange={onChangeComplete}
          step={step}
        />
      </div>
    </div>
  )
}
