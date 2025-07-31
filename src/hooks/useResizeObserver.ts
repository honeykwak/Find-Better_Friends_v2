'use client'

import { useEffect, useState, RefObject } from 'react'

interface Dimensions {
  width: number
  height: number
}

function useResizeObserver<T extends HTMLElement>(ref: RefObject<T>): Dimensions {
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })

    resizeObserver.observe(element)

    return () => {
      resizeObserver.unobserve(element)
    }
  }, [ref])

  return dimensions
}

export default useResizeObserver
