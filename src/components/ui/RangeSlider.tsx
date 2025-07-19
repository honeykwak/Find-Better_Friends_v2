'use client'

import { useRef, useState, useEffect } from 'react'

const useRangeSlider = (
  min: number,
  max: number,
  values: [number, number],
  onChangeComplete: (values: [number, number]) => void,
  step: number = 1
) => {
  const [currentValues, setCurrentValues] = useState<[number, number]>(values)
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const minThumbRef = useRef<HTMLDivElement>(null)
  const maxThumbRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'min' | 'max' | null>(null)

  const onChangeCompleteRef = useRef(onChangeComplete)
  onChangeCompleteRef.current = onChangeComplete

  const valuesRef = useRef(currentValues)
  valuesRef.current = currentValues

  useEffect(() => {
    setCurrentValues(values)
  }, [values[0], values[1]])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !sliderRef.current) return

      const rect = sliderRef.current.getBoundingClientRect()
      const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
      const rawValue = (percent / 100) * (max - min) + min
      const newValue = Math.round(rawValue / step) * step;

      setCurrentValues(currentVals => {
        let [currentMin, currentMax] = currentVals
        if (draggingRef.current === 'min') {
          currentMin = Math.min(newValue, currentMax)
        } else {
          currentMax = Math.max(newValue, currentMin)
        }
        return [currentMin, currentMax]
      })
    }

    const handleMouseUp = () => {
      if (draggingRef.current) {
        onChangeCompleteRef.current(valuesRef.current)
        draggingRef.current = null
        setActiveThumb(null)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    const handleMouseDown = (thumb: 'min' | 'max') => {
      draggingRef.current = thumb
      setActiveThumb(thumb)
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    const minThumb = minThumbRef.current
    const maxThumb = maxThumbRef.current
    const handleMinMouseDown = () => handleMouseDown('min')
    const handleMaxMouseDown = () => handleMouseDown('max')

    minThumb?.addEventListener('mousedown', handleMinMouseDown)
    maxThumb?.addEventListener('mousedown', handleMaxMouseDown)

    return () => {
      minThumb?.removeEventListener('mousedown', handleMinMouseDown)
      maxThumb?.removeEventListener('mousedown', handleMaxMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [min, max, step])

  const minPercent = max > min ? ((currentValues[0] - min) / (max - min)) * 100 : 0
  const maxPercent = max > min ? ((currentValues[1] - min) / (max - min)) * 100 : 0

  return { sliderRef, minThumbRef, maxThumbRef, currentValues, minPercent, maxPercent, activeThumb }
}

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  values: [number, number];
  onChange: (values: [number, number]) => void;
  formatValue: (value: number) => string;
  step?: number;
  children?: React.ReactNode;
  color?: string;
}

export default function RangeSlider({ 
  label, 
  min, 
  max, 
  values, 
  onChange, 
  formatValue, 
  step = 1, 
  children,
  color = '#3b82f6' // Default to blue-500
}: RangeSliderProps) {
  const { sliderRef, minThumbRef, maxThumbRef, currentValues, minPercent, maxPercent, activeThumb } = useRangeSlider(
    min, max, values, onChange, step
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium" style={{ color: '#111827' }}>{label}</label>
        {children}
      </div>
      <div 
        className="relative w-full h-9 border border-gray-300 rounded-md overflow-hidden" 
        ref={sliderRef}
      >
        <div className="absolute top-0 left-0 w-full h-full bg-gray-200" />
        <div 
          className="absolute top-0 h-full flex items-center justify-center overflow-hidden pointer-events-none" 
          style={{ 
            left: `${minPercent}%`, 
            right: `${100 - maxPercent}%`,
            backgroundColor: color
          }} 
        >
          <span className="text-xs font-medium text-white whitespace-nowrap">
            {formatValue(currentValues[0])} - {formatValue(currentValues[1])}
          </span>
        </div>
        
        <div 
          ref={minThumbRef} 
          className={`absolute top-1/2 w-4 h-4 bg-white border-2 rounded-full cursor-pointer ${activeThumb === 'min' ? 'z-20' : 'z-10'}`} 
          style={{ 
            left: `${minPercent}%`, 
            transform: 'translate(-50%, -50%)',
            borderColor: color
          }} 
        />
        <div 
          ref={maxThumbRef} 
          className={`absolute top-1/2 w-4 h-4 bg-white border-2 rounded-full cursor-pointer ${activeThumb === 'max' ? 'z-20' : 'z-10'}`} 
          style={{ 
            left: `${maxPercent}%`, 
            transform: 'translate(-50%, -50%)',
            borderColor: color
          }} 
        />
      </div>
    </div>
  )
}
