'use client'

import { useRef, useState, useEffect, useLayoutEffect } from 'react'

type DisplayMode = 'internal' | 'split' | 'combined-left' | 'combined-right'

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
  );
  
  const [displayMode, setDisplayMode] = useState<DisplayMode>('internal');
  
  const measurementRefs = {
    combined: useRef<HTMLSpanElement>(null),
    min: useRef<HTMLSpanElement>(null),
    max: useRef<HTMLSpanElement>(null),
  };

  const rangeText = {
    combined: `${formatValue(currentValues[0])} - ${formatValue(currentValues[1])}`,
    min: formatValue(currentValues[0]),
    max: formatValue(currentValues[1]),
  };

  useLayoutEffect(() => {
    const PADDING = 16;
    const slider = sliderRef.current;
    const combinedText = measurementRefs.combined.current;
    const minText = measurementRefs.min.current;
    const maxText = measurementRefs.max.current;

    if (!slider || !combinedText || !minText || !maxText) return;

    const sliderWidth = slider.offsetWidth;
    const fillWidth = (maxPercent - minPercent) / 100 * sliderWidth;
    const leftTrackWidth = (minPercent / 100) * sliderWidth;
    const rightTrackWidth = (100 - maxPercent) / 100 * sliderWidth;
    
    const combinedTextWidth = combinedText.offsetWidth;
    const minTextWidth = minText.offsetWidth;
    const maxTextWidth = maxText.offsetWidth;

    if (fillWidth >= combinedTextWidth + PADDING) {
      setDisplayMode('internal');
    } else if (leftTrackWidth >= minTextWidth + PADDING && rightTrackWidth >= maxTextWidth + PADDING) {
      setDisplayMode('split');
    } else if (leftTrackWidth > rightTrackWidth && leftTrackWidth >= combinedTextWidth + PADDING) {
      setDisplayMode('combined-left');
    } else if (rightTrackWidth > leftTrackWidth && rightTrackWidth >= combinedTextWidth + PADDING) {
      setDisplayMode('combined-right');
    } else {
      // Fallback: if split is not possible, choose the wider side for combined text
      if (leftTrackWidth > rightTrackWidth) {
        setDisplayMode('combined-left');
      } else {
        setDisplayMode('combined-right');
      }
    }
  }, [currentValues, minPercent, maxPercent, measurementRefs.combined, measurementRefs.min, measurementRefs.max, sliderRef]);

  return (
    <div>
      {/* Measurement Layer (Invisible) */}
      <div style={{ position: 'absolute', visibility: 'hidden', zIndex: -1 }}>
        <span ref={measurementRefs.combined} className="text-xs font-medium whitespace-nowrap">{rangeText.combined}</span>
        <span ref={measurementRefs.min} className="text-xs font-medium whitespace-nowrap">{rangeText.min}</span>
        <span ref={measurementRefs.max} className="text-xs font-medium whitespace-nowrap">{rangeText.max}</span>
      </div>

      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium" style={{ color: '#111827' }}>{label}</label>
        {children}
      </div>
      <div 
        className="relative w-full h-9 border border-gray-300 rounded-md overflow-hidden" 
        ref={sliderRef}
      >
        <div className="absolute top-0 left-0 w-full h-full bg-gray-200" />
        
        {/* Fill Area */}
        <div 
          className="absolute top-0 h-full pointer-events-none" 
          style={{ 
            left: `${minPercent}%`, 
            right: `${100 - maxPercent}%`,
            backgroundColor: color
          }} 
        />

        {/* Text Display Layer */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          {/* Internal: Centered within the fill area */}
          {displayMode === 'internal' && (
            <div 
              className="absolute h-full flex items-center justify-center"
              style={{
                left: `${minPercent}%`,
                width: `${maxPercent - minPercent}%`,
              }}
            >
              <span className="text-xs font-medium text-white whitespace-nowrap">
                {rangeText.combined}
              </span>
            </div>
          )}

          {/* Split: Min/Max values positioned next to their respective thumbs */}
          {displayMode === 'split' && (
            <>
              {/* Min value, to the left of the min thumb */}
              <div 
                className="absolute h-full flex items-center justify-end"
                style={{
                  left: `0%`,
                  width: `${minPercent}%`,
                }}
              >
                <span className="pr-4 text-xs font-medium whitespace-nowrap" style={{ color: '#111827' }}>
                  {rangeText.min}
                </span>
              </div>
              {/* Max value, to the right of the max thumb */}
              <div 
                className="absolute h-full flex items-center justify-start"
                style={{
                  left: `${maxPercent}%`,
                  right: `0%`,
                }}
              >
                <span className="pl-4 text-xs font-medium whitespace-nowrap" style={{ color: '#111827' }}>
                  {rangeText.max}
                </span>
              </div>
            </>
          )}

          {/* Combined Left: Positioned to the left of the min thumb */}
          {displayMode === 'combined-left' && (
            <div 
              className="absolute h-full flex items-center justify-end"
              style={{
                left: `0%`,
                width: `${minPercent}%`,
              }}
            >
              <span className="pr-4 text-xs font-medium whitespace-nowrap" style={{ color: '#111827' }}>
                {rangeText.combined}
              </span>
            </div>
          )}

          {/* Combined Right: Positioned to the right of the max thumb */}
          {displayMode === 'combined-right' && (
            <div 
              className="absolute h-full flex items-center justify-start"
              style={{
                left: `${maxPercent}%`,
                right: `0%`,
              }}
            >
              <span className="pl-4 text-xs font-medium whitespace-nowrap" style={{ color: '#111827' }}>
                {rangeText.combined}
              </span>
            </div>
          )}
        </div>
        
        {/* Thumbs */}
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
