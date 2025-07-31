'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

const useRangeSlider = (
  min: number,
  max: number,
  initialValues: [number, number],
  onChangeComplete: (values: [number, number]) => void,
  onValuesChange?: (values: [number, number]) => void,
  step: number = 1
) => {
  const sliderRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'min' | 'max' | null>(null)
  
  const onChangeCompleteRef = useRef(onChangeComplete)
  onChangeCompleteRef.current = onChangeComplete
  
  const onValuesChangeRef = useRef(onValuesChange)
  onValuesChangeRef.current = onValuesChange

  const valuesRef = useRef(initialValues)
  valuesRef.current = initialValues

  const handleInteraction = useCallback((e: MouseEvent | TouchEvent) => {
    if (!sliderRef.current) return
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const rect = sliderRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const rawValue = (percent / 100) * (max - min) + min
    
    let newValue: number;
    if (rawValue <= min) newValue = min;
    else if (rawValue >= max) newValue = max;
    else newValue = Math.round(rawValue / step) * step;

    let [currentMin, currentMax] = valuesRef.current
    if (draggingRef.current === 'min') {
      currentMin = Math.min(newValue, currentMax)
    } else {
      currentMax = Math.max(newValue, currentMin)
    }
    
    const newValues: [number, number] = [currentMin, currentMax]
    valuesRef.current = newValues
    onValuesChangeRef.current?.(newValues)

  }, [min, max, step])

  const handleInteractionEnd = useCallback(() => {
    if (draggingRef.current) {
      onChangeCompleteRef.current(valuesRef.current)
      draggingRef.current = null
    }
    window.removeEventListener('mousemove', handleInteraction as EventListener)
    window.removeEventListener('mouseup', handleInteractionEnd)
    window.removeEventListener('touchmove', handleInteraction as EventListener)
    window.removeEventListener('touchend', handleInteractionEnd)
  }, [handleInteraction])

  const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent, thumb: 'min' | 'max') => {
    e.stopPropagation()
    draggingRef.current = thumb
    handleInteraction(e.nativeEvent)
    window.addEventListener('mousemove', handleInteraction as EventListener)
    window.addEventListener('mouseup', handleInteractionEnd)
    window.addEventListener('touchmove', handleInteraction as EventListener)
    window.addEventListener('touchend', handleInteractionEnd)
  }, [handleInteraction, handleInteractionEnd])

  const minPercent = max > min ? ((initialValues[0] - min) / (max - min)) * 100 : 0
  const maxPercent = max > min ? ((initialValues[1] - min) / (max - min)) * 100 : 0

  return { sliderRef, minPercent, maxPercent, handleInteractionStart }
}

interface SimpleRangeSliderProps {
  min: number
  max: number
  values: [number, number]
  onChange: (values: [number, number]) => void
  onValuesChange?: (values: [number, number]) => void
  step?: number
  color?: string
}

export default function SimpleRangeSlider({
  min,
  max,
  values,
  onChange,
  onValuesChange,
  step = 1,
  color = '#3b82f6',
}: SimpleRangeSliderProps) {
  const { sliderRef, minPercent, maxPercent, handleInteractionStart } = useRangeSlider(
    min, max, values, onChange, onValuesChange, step
  )

  return (
    <div className="relative w-full h-5 select-none" ref={sliderRef}>
      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full" />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
        style={{
          left: `${minPercent}%`,
          width: `${maxPercent - minPercent}%`,
          backgroundColor: color,
        }}
      />
      <div
        onMouseDown={(e) => handleInteractionStart(e, 'min')}
        onTouchStart={(e) => handleInteractionStart(e, 'min')}
        className="absolute top-1/2 w-4 h-4 bg-white border-2 rounded-full cursor-pointer -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${minPercent}%`,
          borderColor: color,
          zIndex: 10
        }}
      />
      <div
        onMouseDown={(e) => handleInteractionStart(e, 'max')}
        onTouchStart={(e) => handleInteractionStart(e, 'max')}
        className="absolute top-1/2 w-4 h-4 bg-white border-2 rounded-full cursor-pointer -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${maxPercent}%`,
          borderColor: color,
          zIndex: 10
        }}
      />
    </div>
  )
}
