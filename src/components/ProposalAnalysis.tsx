'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { calculateProposalVoteDistribution } from '@/lib/dataLoader'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { VOTE_COLORS, VOTE_ORDER, type VoteOption } from '@/constants/voteColors'

// Zoom configuration
const ZOOM_CONFIG = {
  min: 0.1,
  max: 10,
  step: 0.1,
  fastStep: 0.3, // Faster zoom step
  default: 1
}

// Performance configuration
const PERFORMANCE_CONFIG = {
  maxInitialRender: 500, // 초기 렌더링할 최대 제안 수
  chunkSize: 100, // 청킹 단위
  renderDelay: 16, // 렌더링 지연 (60fps)
  maxDataPoints: 2000 // 최대 데이터 포인트
}

// Calculate optimal initial zoom to prevent overlapping
const calculateOptimalZoom = (dataLength: number, containerWidth: number) => {
  if (dataLength === 0 || containerWidth === 0) return ZOOM_CONFIG.default
  
  // Calculate minimum zoom needed for 1px per bar
  const availableWidth = containerWidth - 160 // Account for margins (80px left + 80px right)
  const minPixelsPerBar = 1
  const requiredWidth = dataLength * minPixelsPerBar
  
  if (requiredWidth > availableWidth) {
    // Need to zoom in to show all bars with minimum 1px width
    const requiredZoom = requiredWidth / availableWidth
    return Math.min(requiredZoom, ZOOM_CONFIG.max)
  }
  
  return ZOOM_CONFIG.default
}

export default function ProposalAnalysis() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isInitialized, setIsInitialized] = useState(false)
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    content: string
  }>({ visible: false, x: 0, y: 0, content: '' })

  // Performance states
  const [isProcessing, setIsProcessing] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  const [visibleDataRange, setVisibleDataRange] = useState({ start: 0, end: PERFORMANCE_CONFIG.maxInitialRender })

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(ZOOM_CONFIG.default)
  const [panOffset, setPanOffset] = useState(0) // For horizontal panning
  const [isDragging, setIsDragging] = useState(false)
  const [isNavDragging, setIsNavDragging] = useState(false) // Separate state for navigation bar dragging
  const [dragStart, setDragStart] = useState({ x: 0, offset: 0 })

  const {
    proposalData,
    rawProposals,
    rawVotes,
    selectedCategories,
    selectedTopics,
    selectedChain,
    loading,
    error,
    windowSize,
    getFilteredProposals
  } = useGlobalStore()

  // Calculate responsive layout
  const isMobileScreen = windowSize.width < 640
  
  // Memoized data preparation with performance optimization
  const mainVisualizationData = useMemo(() => {
    if (isProcessing) return null // 처리 중일 때는 이전 데이터 유지
    
    const filteredProposals = getFilteredProposals()
    
    if (filteredProposals.length === 0) return null

    // 데이터 크기 제한
    const limitedProposals = filteredProposals.length > PERFORMANCE_CONFIG.maxDataPoints 
      ? filteredProposals.slice(0, PERFORMANCE_CONFIG.maxDataPoints)
      : filteredProposals

    console.log(`📊 ProposalAnalysis: Processing ${limitedProposals.length} proposals (limited from ${filteredProposals.length})`)

    // Calculate distribution using actual voting data
    const proposalVoteData = calculateProposalVoteDistribution(limitedProposals, rawVotes)
    
    // Sort by timestamp to ensure chronological order
    const sortedData = proposalVoteData
      .map(data => ({
        ...data,
        timestamp: data.proposal.timestamp,
        date: new Date(data.proposal.timestamp)
      }))
      .sort((a, b) => a.timestamp - b.timestamp)

    // Pre-calculate date range for performance
    const dates = sortedData.map(d => d.date)
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
    const totalTimeRange = maxDate.getTime() - minDate.getTime()

    return {
      data: sortedData,
      minDate,
      maxDate,
      totalTimeRange,
      isLimited: filteredProposals.length > PERFORMANCE_CONFIG.maxDataPoints,
      totalCount: filteredProposals.length
    }
  }, [getFilteredProposals, rawVotes, selectedCategories, selectedTopics, selectedChain, proposalData, isProcessing])

  // 데이터 처리 상태 관리
  useEffect(() => {
    if (mainVisualizationData && mainVisualizationData.data.length > PERFORMANCE_CONFIG.maxInitialRender) {
      setIsProcessing(true)
      setRenderProgress(0)
      
      // 점진적 렌더링
      const totalChunks = Math.ceil(mainVisualizationData.data.length / PERFORMANCE_CONFIG.chunkSize)
      let currentChunk = 0
      
      const processChunk = () => {
        currentChunk++
        const progress = (currentChunk / totalChunks) * 100
        setRenderProgress(progress)
        
        if (currentChunk < totalChunks) {
          setTimeout(processChunk, PERFORMANCE_CONFIG.renderDelay)
        } else {
          setIsProcessing(false)
          setVisibleDataRange({ start: 0, end: mainVisualizationData.data.length })
        }
      }
      
      setTimeout(processChunk, PERFORMANCE_CONFIG.renderDelay)
    } else {
      setIsProcessing(false)
      setRenderProgress(100)
      if (mainVisualizationData) {
        setVisibleDataRange({ start: 0, end: mainVisualizationData.data.length })
      }
    }
  }, [mainVisualizationData])

  // Debounced zoom state for smooth interactions (only for zoom/pan, not filters)
  const [debouncedZoomLevel, setDebouncedZoomLevel] = useState(zoomLevel)
  const [debouncedPanOffset, setDebouncedPanOffset] = useState(panOffset)

  // Debounce zoom and pan updates (but not filter changes)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedZoomLevel(zoomLevel)
      setDebouncedPanOffset(panOffset)
    }, 16) // ~60fps

    return () => clearTimeout(timer)
  }, [zoomLevel, panOffset])

  // Reset debounced values immediately when filters change
  useEffect(() => {
    setDebouncedZoomLevel(zoomLevel)
    setDebouncedPanOffset(panOffset)
  }, [selectedCategories, selectedTopics, selectedChain, zoomLevel, panOffset])

  // Handle mouse wheel zoom with smooth animation
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    
    // Dynamic zoom step based on current zoom level and wheel speed
    const wheelSpeed = Math.abs(e.deltaY)
    const isFastScroll = wheelSpeed > 100
    const baseStep = isFastScroll ? ZOOM_CONFIG.fastStep : ZOOM_CONFIG.step
    
    // Scale step based on current zoom level for more natural feel
    const zoomMultiplier = Math.max(0.5, Math.min(2, zoomLevel * 0.3))
    const dynamicStep = baseStep * zoomMultiplier
    
    const delta = e.deltaY > 0 ? -dynamicStep : dynamicStep
    
    // Calculate minimum zoom to show all proposals (fit-to-data)
    let minZoom = ZOOM_CONFIG.min
    if (mainVisualizationData && dimensions.width > 0) {
      // When zoom = 1, we show the full time range
      // When zoom < 1, we show more than the full time range (zoomed out)
      // We want to prevent zooming out beyond showing all data with some padding
      
      // Minimum zoom should be when all data fits comfortably in view
      // This is essentially zoom = 1 (show full data range)
      minZoom = Math.max(ZOOM_CONFIG.min, 0.8) // Allow slight zoom out for padding
    }
    
    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      setZoomLevel(prev => {
        const newZoom = Math.max(minZoom, Math.min(ZOOM_CONFIG.max, prev + delta))
        
        // Debug info for zoom constraints
        if (process.env.NODE_ENV === 'development' && newZoom !== prev + delta) {
          if (newZoom === minZoom) {
            console.log(`🔒 Zoom limited to minimum: ${minZoom.toFixed(2)}x (fit-to-data)`)
          } else if (newZoom === ZOOM_CONFIG.max) {
            console.log(`🔒 Zoom limited to maximum: ${ZOOM_CONFIG.max}x`)
          }
        }
        
        return newZoom
      })
    })
  }, [mainVisualizationData, dimensions.width, zoomLevel])

  // Handle navigation bar click (for jumping to position)
  const handleNavClick = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current || !mainVisualizationData) return
    
    const svgRect = svgRef.current.getBoundingClientRect()
    const clickX = e.clientX - svgRect.left
    const clickY = e.clientY - svgRect.top
    
    // Check if clicking in navigation area (bottom 40px)
    const svgHeight = svgRect.height
    const navAreaTop = svgHeight - 40
    
    if (clickY >= navAreaTop) {
      e.preventDefault()
      e.stopPropagation()
      
      // Calculate new pan offset based on click position
      const { totalTimeRange, minDate } = mainVisualizationData
      const margin = { left: 10, right: 10 } // Match SVG margins
      const width = svgRect.width - margin.left - margin.right
      const adjustedClickX = clickX - margin.left
      
      if (adjustedClickX >= 0 && adjustedClickX <= width) {
        const clickRatio = adjustedClickX / width
        const targetCenterTime = minDate.getTime() + (clickRatio * totalTimeRange)
        const currentCenterTime = minDate.getTime() + totalTimeRange / 2
        const newPanAdjustment = (currentCenterTime - targetCenterTime)
        const newPanOffset = newPanAdjustment / (totalTimeRange / width)
        
        // Apply boundaries
        const zoomedTimeRange = totalTimeRange / zoomLevel
        const maxPanOffset = (totalTimeRange - zoomedTimeRange) / 2 * (width / totalTimeRange)
        const minPanOffset = -maxPanOffset
        const clampedPanOffset = Math.max(minPanOffset, Math.min(maxPanOffset, newPanOffset))
        
        setPanOffset(clampedPanOffset)
      }
    }
  }, [mainVisualizationData, zoomLevel])

  // Handle mouse drag for panning (chart area only)
  const handleChartMouseDown = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current || !containerRef.current) return
    
    // Get click position relative to SVG
    const svgRect = svgRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    const clickY = e.clientY - svgRect.top
    
    // Calculate navigation area bounds (bottom 40px of SVG)
    const svgHeight = svgRect.height
    const navAreaTop = svgHeight - 40 // Navigation area is in bottom 40px
    
    // If clicking in navigation area, handle as navigation drag
    if (clickY >= navAreaTop) {
      e.preventDefault()
      setIsNavDragging(true)
      setDragStart({ x: e.clientX, offset: panOffset })
      return
    }
    
    // Otherwise, handle as chart drag
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, offset: panOffset })
  }, [panOffset])

  // Handle double click to reset zoom
  const handleDoubleClick = useCallback(() => {
    // Reset to fit-to-data zoom level
    let resetZoom = ZOOM_CONFIG.default
    if (mainVisualizationData && dimensions.width > 0) {
      resetZoom = 1.0 // Show full data range
    }
    setZoomLevel(resetZoom)
    setPanOffset(0)
  }, [mainVisualizationData, dimensions.width])

  // Handle global mouse events for dragging
  useEffect(() => {
    if (!isDragging && !isNavDragging) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x
      
      if (isDragging) {
        // Chart area dragging: REVERSE direction (like map/image viewer)
        const sensitivity = 2 / zoomLevel
        const newPanOffset = dragStart.offset - deltaX * sensitivity // Note: MINUS for reverse direction
        
        // Apply pan boundaries based on current data
        if (mainVisualizationData && dimensions.width > 0) {
          const { totalTimeRange } = mainVisualizationData
          const width = dimensions.width - 20 // Account for minimal margins (10px left + 10px right)
          const zoomedTimeRange = totalTimeRange / zoomLevel
          
          // Calculate maximum pan offset to keep data in view
          const maxPanOffset = (totalTimeRange - zoomedTimeRange) / 2 * (width / totalTimeRange)
          const minPanOffset = -maxPanOffset
          
          // Clamp pan offset to boundaries
          const clampedPanOffset = Math.max(minPanOffset, Math.min(maxPanOffset, newPanOffset))
          setPanOffset(clampedPanOffset)
        } else {
          setPanOffset(newPanOffset)
        }
      } else if (isNavDragging) {
        // Navigation bar dragging: SAME direction (like slider)
        const sensitivity = 1 // Direct 1:1 mapping for navigation
        const newPanOffset = dragStart.offset + deltaX * sensitivity // Note: PLUS for same direction
        
        // Apply pan boundaries
        if (mainVisualizationData && dimensions.width > 0) {
          const { totalTimeRange } = mainVisualizationData
          const width = dimensions.width - 20
          const zoomedTimeRange = totalTimeRange / zoomLevel
          
          const maxPanOffset = (totalTimeRange - zoomedTimeRange) / 2 * (width / totalTimeRange)
          const minPanOffset = -maxPanOffset
          
          const clampedPanOffset = Math.max(minPanOffset, Math.min(maxPanOffset, newPanOffset))
          setPanOffset(clampedPanOffset)
        } else {
          setPanOffset(newPanOffset)
        }
      }
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      setIsNavDragging(false)
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, isNavDragging, dragStart, zoomLevel, mainVisualizationData, dimensions.width, isMobileScreen])

  // Reset zoom when data changes with optimal zoom calculation
  useEffect(() => {
    if (mainVisualizationData && dimensions.width > 0) {
      const optimalZoom = calculateOptimalZoom(mainVisualizationData.data.length, dimensions.width)
      
      // Apply minimum zoom constraint (fit-to-data)
      const minZoom = 0.8 // Allow slight zoom out for padding
      const constrainedZoom = Math.max(minZoom, optimalZoom)
      
      setZoomLevel(constrainedZoom)
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Auto-calculated optimal zoom: ${optimalZoom.toFixed(2)}x, constrained to: ${constrainedZoom.toFixed(2)}x for ${mainVisualizationData.data.length} proposals`)
      }
    } else {
      setZoomLevel(ZOOM_CONFIG.default)
    }
    setPanOffset(0)
  }, [selectedChain, selectedCategories, selectedTopics, mainVisualizationData, dimensions.width])

  // Improved resize observer with width/height separation
  useEffect(() => {
    const updateDimensions = (newWidth?: number, newHeight?: number) => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        const finalWidth = newWidth ?? width
        const finalHeight = newHeight ?? height
        
        if (finalWidth > 0 && finalHeight > 0) {
          setDimensions(prev => {
            // Only update if there's a meaningful change
            const widthChanged = Math.abs(prev.width - finalWidth) > 1
            const heightChanged = Math.abs(prev.height - finalHeight) > 1
            
            if (widthChanged || heightChanged) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`📐 Dimensions update: ${finalWidth.toFixed(0)}×${finalHeight.toFixed(0)} (W:${widthChanged ? 'changed' : 'same'}, H:${heightChanged ? 'changed' : 'same'})`)
              }
              return { width: finalWidth, height: finalHeight }
            }
            return prev
          })
          
          if (!isInitialized) {
            setIsInitialized(true)
          }
        }
      }
    }

    // Force immediate initialization after data is loaded
    if (!isInitialized && proposalData && !loading) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        updateDimensions()
        // Fallback initialization even if dimensions are 0
        if (!isInitialized) {
          setIsInitialized(true)
        }
      })
    }

    // Initial measurement with multiple attempts
    const initialMeasurement = () => {
      updateDimensions()
      
      // If still no dimensions, try again after a short delay
      if (dimensions.width === 0 || dimensions.height === 0) {
        setTimeout(() => updateDimensions(), 50)
        setTimeout(() => updateDimensions(), 150)
        setTimeout(() => updateDimensions(), 300)
      }
    }

    // Use ResizeObserver if available, fallback to window resize
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      let lastWidth = 0
      let lastHeight = 0
      
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          
          if (width > 0 && height > 0) {
            // Track what actually changed
            const widthChanged = Math.abs(lastWidth - width) > 1
            const heightChanged = Math.abs(lastHeight - height) > 1
            
            if (widthChanged || heightChanged) {
              if (process.env.NODE_ENV === 'development') {
                const changeType = widthChanged && heightChanged ? 'both' : 
                                 widthChanged ? 'width only' : 'height only'
                console.log(`🔄 ResizeObserver: ${changeType} changed (${width.toFixed(0)}×${height.toFixed(0)})`)
              }
              
              updateDimensions(width, height)
              lastWidth = width
              lastHeight = height
            }
          }
        }
      })

      resizeObserver.observe(containerRef.current)
      
      // Initial measurement
      initialMeasurement()

      return () => {
        resizeObserver.disconnect()
      }
    } else {
      // Fallback to window resize events (only for width changes)
      const handleWindowResize = () => {
        if (containerRef.current) {
          const { width } = containerRef.current.getBoundingClientRect()
          updateDimensions(width, dimensions.height) // Keep existing height
        }
      }
      
      initialMeasurement()
      window.addEventListener('resize', handleWindowResize)
      
      return () => {
        window.removeEventListener('resize', handleWindowResize)
      }
    }
  }, [dimensions.width, dimensions.height, isInitialized, proposalData, loading])

  // Force re-render when data changes and ensure initialization
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect()
      if (width > 0 && height > 0) {
        setDimensions({ width, height })
      }
      // Force initialization if data is available but not initialized
      if (!isInitialized && proposalData && !loading) {
        setIsInitialized(true)
      }
    }
  }, [proposalData, selectedChain, selectedCategories, selectedTopics, isInitialized, loading])

  // Custom D3-style visualization
  useEffect(() => {
    if (!svgRef.current || !isInitialized || dimensions.width === 0 || dimensions.height === 0) return

    if (!mainVisualizationData || mainVisualizationData.data.length === 0) return
    
    const { data, minDate, maxDate, totalTimeRange } = mainVisualizationData

    const svg = svgRef.current
    const margin = { 
      top: 10, 
      right: 10, 
      bottom: 30, // 미니멀 네비게이션 공간
      left: 10 
    }
    const width = dimensions.width - margin.left - margin.right
    const height = dimensions.height - margin.top - margin.bottom

    if (width <= 0 || height <= 0) return

    // Clear previous content
    svg.innerHTML = ''

    // Create scales with zoom and pan (using pre-calculated values)
    const zoomedTimeRange = totalTimeRange / debouncedZoomLevel
    const centerTime = minDate.getTime() + totalTimeRange / 2
    
    // Apply pan offset with boundaries
    const maxPanAdjustment = (totalTimeRange - zoomedTimeRange) / 2
    const panAdjustment = Math.max(-maxPanAdjustment, Math.min(maxPanAdjustment, 
      debouncedPanOffset * (totalTimeRange / width)))
    
    const viewMinTime = centerTime - zoomedTimeRange / 2 + panAdjustment // 방향 수정: - → +
    const viewMaxTime = centerTime + zoomedTimeRange / 2 + panAdjustment // 방향 수정: - → +
    
    const xScale = (date: Date) => {
      const ratio = (date.getTime() - viewMinTime) / (viewMaxTime - viewMinTime)
      return ratio * width
    }

    const yScale = (value: number) => height - (value * height)

    // Use global vote colors
    const colors = VOTE_COLORS

    // Create main group
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`)
    svg.appendChild(g)

    // Add single event listener for all bars (event delegation)
    const handleBarHover = (e: MouseEvent) => {
      const target = e.target as SVGRectElement
      if (target.tagName === 'rect' && target.hasAttribute('data-vote-type')) {
        target.setAttribute('opacity', '1')
        
        const rect_bounds = target.getBoundingClientRect()
        const container_bounds = containerRef.current!.getBoundingClientRect()
        
        const voteType = target.getAttribute('data-vote-type')!
        const value = parseFloat(target.getAttribute('data-value')!)
        const title = target.getAttribute('data-title')!
        const date = target.getAttribute('data-date')!
        const totalVotes = target.getAttribute('data-total-votes')!
        const votingPower = target.getAttribute('data-voting-power')!
        
        setTooltip({
          visible: true,
          x: rect_bounds.left - container_bounds.left + rect_bounds.width / 2,
          y: rect_bounds.top - container_bounds.top,
          content: `
            <div class="bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm">
              <div class="font-semibold">${title}</div>
              <div class="text-gray-300 mt-1">${date}</div>
              <div class="mt-2">
                <div class="text-green-400">${voteType}: ${(value * 100).toFixed(1)}%</div>
                <div class="text-gray-400">Total Votes: ${totalVotes}</div>
                <div class="text-gray-400">Voting Power: ${votingPower}</div>
              </div>
            </div>
          `
        })
      }
    }

    const handleBarLeave = (e: MouseEvent) => {
      const target = e.target as SVGRectElement
      if (target.tagName === 'rect' && target.hasAttribute('data-vote-type')) {
        target.setAttribute('opacity', '0.8')
        setTooltip(prev => ({ ...prev, visible: false }))
      }
    }

    g.addEventListener('mouseenter', handleBarHover, true)
    g.addEventListener('mouseleave', handleBarLeave, true)

    // Draw grid lines
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    gridGroup.setAttribute('class', 'grid')
    g.appendChild(gridGroup)

    // Y-axis grid lines (minimal - only 50% reference)
    const y50Grid = yScale(0.5)
    const line50 = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line50.setAttribute('x1', '0')
    line50.setAttribute('y1', y50Grid.toString())
    line50.setAttribute('x2', width.toString())
    line50.setAttribute('y2', y50Grid.toString())
    line50.setAttribute('stroke', 'rgba(0,0,0,0.2)')
    line50.setAttribute('stroke-width', '1')
    line50.setAttribute('stroke-dasharray', '3,3')
    gridGroup.appendChild(line50)

    // Calculate bar width based on data density and zoom level (improved overlap prevention)
    const availableWidth = width * 0.9 // Use 90% of available width
    const idealBarWidth = availableWidth / data.length
    const baseBarWidth = Math.max(1, Math.min(20, idealBarWidth))
    const barWidth = Math.max(0.5, baseBarWidth * debouncedZoomLevel)
    
    // Debug info for development
    if (process.env.NODE_ENV === 'development') {
      const pixelsPerBar = availableWidth / data.length
      if (pixelsPerBar < 1) {
        console.log(`⚠️ Overlap detected: ${pixelsPerBar.toFixed(3)} pixels per bar. Consider zooming in.`)
      }
    }

    // MONTH-BASED POSITIONING WITH UNIFORM BAR WIDTH
    // Group proposals by month and distribute them evenly within each month
    
    // Step 1: Group data by year-month
    const monthGroups = new Map<string, typeof data>()
    data.forEach(d => {
      const monthKey = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`
      if (!monthGroups.has(monthKey)) {
        monthGroups.set(monthKey, [])
      }
      monthGroups.get(monthKey)!.push(d)
    })
    
    // Step 2: Calculate month boundaries and distribute proposals within each month
    const timePositions: number[] = new Array(data.length)
    const monthKeys = Array.from(monthGroups.keys()).sort()
    
    monthKeys.forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number)
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0) // Last day of the month
      
      const monthStartX = xScale(monthStart)
      const monthEndX = xScale(monthEnd)
      const monthWidth = monthEndX - monthStartX
      
      const proposalsInMonth = monthGroups.get(monthKey)!
      const proposalCount = proposalsInMonth.length
      
      // Distribute proposals evenly within the month
      proposalsInMonth.forEach((proposal, index) => {
        const originalIndex = data.indexOf(proposal)
        if (proposalCount === 1) {
          // Single proposal: place in the middle of the month
          timePositions[originalIndex] = monthStartX + monthWidth / 2
        } else {
          // Multiple proposals: distribute evenly across the full month
          const spacing = monthWidth / (proposalCount - 1)
          timePositions[originalIndex] = monthStartX + (index * spacing)
        }
      })
    })
    
    // Step 3: Calculate minimum distance between any adjacent bars
    const sortedPositions = [...timePositions].sort((a, b) => a - b)
    let globalMinDistance = Infinity
    for (let i = 1; i < sortedPositions.length; i++) {
      const distance = sortedPositions[i] - sortedPositions[i - 1]
      globalMinDistance = Math.min(globalMinDistance, distance)
    }
    
    // Step 4: Determine uniform bar width based on the smallest gap
    const getUniformBarWidth = (): number => {
      if (data.length === 1) return barWidth
      
      // If the smallest gap is smaller than our ideal bar width, 
      // use the full smallest gap (bars can touch but not overlap)
      if (globalMinDistance < barWidth) {
        return Math.max(0.5, globalMinDistance)
      }
      
      return barWidth // Use normal width if there's enough space everywhere
    }
    
    // Calculate the uniform width that all bars will use
    const uniformBarWidth = getUniformBarWidth()

    // Step 5: Filter for visible bars using month-based positions
    const visibleData = data.filter((d, i) => {
      const x = timePositions[i]
      return x >= -uniformBarWidth && x <= width + uniformBarWidth
    })

    // Performance monitoring
    if (process.env.NODE_ENV === 'development') {
      console.log(`Rendering ${visibleData.length} bars (${data.length} total)`)
      console.log(`Filters - Chain: ${selectedChain}, Categories: ${selectedCategories.length}, Topics: ${selectedTopics.length}`)
      console.log(`Month groups: ${monthGroups.size} months`)
      
      // Check for month-based positioning
      const monthPositioningCheck = data.slice(0, 5).map((d, i) => ({
        proposal: d.title.substring(0, 20),
        date: d.date.toISOString().split('T')[0],
        monthPosition: timePositions[i].toFixed(1),
        uniformWidth: uniformBarWidth.toFixed(1)
      }))
      console.log('📍 Month-based positioning with uniform width:', monthPositioningCheck)
    }

    // Draw stacked bars with MONTH-BASED positions and uniform width
    visibleData.forEach((d, visibleIndex) => {
      const originalIndex = data.indexOf(d)
      const x = timePositions[originalIndex] // Month-distributed position
      
      if (process.env.NODE_ENV === 'development' && visibleIndex < 3) {
        console.log(`Bar ${originalIndex}: date=${d.date.toISOString().split('T')[0]}, x=${x.toFixed(1)}px, width=${uniformBarWidth.toFixed(1)}px`)
      }
      
      let currentY = height

      // Use global vote order
      const voteTypes = VOTE_ORDER
      
      voteTypes.forEach(voteType => {
        const value = d.votes[voteType]
        if (value > 0) {
          const barHeight = value * height
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          rect.setAttribute('x', (x - uniformBarWidth / 2).toString()) // Center the bar on time position
          rect.setAttribute('y', (currentY - barHeight).toString())
          rect.setAttribute('width', uniformBarWidth.toString()) // Use uniform width
          rect.setAttribute('height', barHeight.toString())
          rect.setAttribute('fill', colors[voteType])
          rect.setAttribute('opacity', '0.8')
          rect.setAttribute('stroke', 'white')
          rect.setAttribute('stroke-width', Math.min(0.5, uniformBarWidth * 0.1).toString()) // Uniform stroke width
          
          // Store data for event delegation (much faster than individual listeners)
          rect.setAttribute('data-proposal-index', originalIndex.toString())
          rect.setAttribute('data-vote-type', voteType)
          rect.setAttribute('data-value', value.toString())
          rect.setAttribute('data-title', d.title)
          rect.setAttribute('data-date', d.date.toLocaleDateString())
          rect.setAttribute('data-total-votes', d.totalVotes.toString())
          rect.setAttribute('data-voting-power', d.totalVotingPower.toFixed(3))
          
          g.appendChild(rect)
          currentY -= barHeight
        }
      })
    })

    // Draw axes
    const axesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    axesGroup.setAttribute('class', 'axes')
    g.appendChild(axesGroup)

    // X-axis
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    xAxis.setAttribute('x1', '0')
    xAxis.setAttribute('y1', height.toString())
    xAxis.setAttribute('x2', width.toString())
    xAxis.setAttribute('y2', height.toString())
    xAxis.setAttribute('stroke', '#374151')
    xAxis.setAttribute('stroke-width', '2')
    axesGroup.appendChild(xAxis)

    // Y-axis removed for cleaner aesthetic

    // Year guidelines - vertical lines for each year
    const years = new Set<number>()
    data.forEach(d => {
      years.add(d.date.getFullYear())
    })
    
    Array.from(years).sort().forEach(year => {
      // Find the first data point of this year
      const yearStart = new Date(year, 0, 1)
      const x = xScale(yearStart)
      
      // Only draw if within visible area
      if (x >= 0 && x <= width) {
        // Vertical guideline
        const guideline = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        guideline.setAttribute('x1', x.toString())
        guideline.setAttribute('y1', '0')
        guideline.setAttribute('x2', x.toString())
        guideline.setAttribute('y2', height.toString())
        guideline.setAttribute('stroke', 'rgba(0,0,0,0.15)')
        guideline.setAttribute('stroke-width', '1')
        guideline.setAttribute('stroke-dasharray', '2,4')
        axesGroup.appendChild(guideline)
        
        // Year label (position depends on whether months are shown)
        const showMonths = debouncedZoomLevel >= 3
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', x.toString())
        text.setAttribute('y', showMonths ? (height - 24).toString() : (height - 8).toString()) // Above months if shown, otherwise at bottom
        text.setAttribute('text-anchor', 'middle')
        text.setAttribute('font-size', isMobileScreen ? '10' : '12')
        text.setAttribute('font-weight', '600')
        text.setAttribute('fill', '#374151')
        text.setAttribute('opacity', '0.8') // Slightly transparent to not interfere with data
        text.textContent = year.toString()
        axesGroup.appendChild(text)
      }
    })

    // Month guidelines - show when zoomed in enough
    if (debouncedZoomLevel >= 3) { // Show months when zoomed in 3x or more
      const months = new Set<string>()
      data.forEach(d => {
        const monthKey = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`
        months.add(monthKey)
      })
      
      Array.from(months).sort().forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number)
        const monthStart = new Date(year, month - 1, 1)
        const x = xScale(monthStart)
        
        // Only draw if within visible area
        if (x >= 0 && x <= width) {
          // Vertical guideline (lighter than year guidelines)
          const guideline = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          guideline.setAttribute('x1', x.toString())
          guideline.setAttribute('y1', '0')
          guideline.setAttribute('x2', x.toString())
          guideline.setAttribute('y2', height.toString())
          guideline.setAttribute('stroke', 'rgba(0,0,0,0.08)')
          guideline.setAttribute('stroke-width', '1')
          guideline.setAttribute('stroke-dasharray', '1,3')
          axesGroup.appendChild(guideline)
          
          // Month label (smaller and lighter than year labels, below year)
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
          text.setAttribute('x', x.toString())
          text.setAttribute('y', (height - 8).toString()) // Below year labels
          text.setAttribute('text-anchor', 'middle')
          text.setAttribute('font-size', isMobileScreen ? '8' : '9')
          text.setAttribute('font-weight', '400')
      text.setAttribute('fill', '#6b7280')
          text.setAttribute('opacity', '0.7')
          text.textContent = monthNames[month - 1]
      axesGroup.appendChild(text)
        }
      })
    }

    // Y-axis labels (50% reference line inside chart)
    const y50 = yScale(0.5)
    const text50 = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text50.setAttribute('x', '8') // Inside chart area
    text50.setAttribute('y', (y50 - 4).toString()) // Above the line
    text50.setAttribute('text-anchor', 'start')
    text50.setAttribute('font-size', isMobileScreen ? '10' : '12')
    text50.setAttribute('fill', '#374151')
    text50.setAttribute('font-weight', '600')
    text50.setAttribute('opacity', '0.8') // Same transparency as year labels
    text50.textContent = '50%'
    axesGroup.appendChild(text50)

    // Minimal navigation indicator (consistent with chart design)
    const navHeight = 2
    const navY = height + 20
    const navGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    navGroup.setAttribute('class', 'navigation')
    g.appendChild(navGroup)

    // Navigation track (subtle line)
    const track = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    track.setAttribute('x1', '0')
    track.setAttribute('y1', navY.toString())
    track.setAttribute('x2', width.toString())
    track.setAttribute('y2', navY.toString())
    track.setAttribute('stroke', 'rgba(0,0,0,0.1)')
    track.setAttribute('stroke-width', '1')
    navGroup.appendChild(track)

    // Calculate indicator position and size (use real-time zoom for responsiveness)
    const scrollbarZoomedTimeRange = totalTimeRange / zoomLevel // 실시간 zoomLevel 사용
    const indicatorWidth = Math.max(8, (scrollbarZoomedTimeRange / totalTimeRange) * width)
    
    // Calculate indicator position based on pan offset (use real-time values for responsiveness)
    const scrollbarCenterTime = minDate.getTime() + totalTimeRange / 2
    const realtimePanAdjustment = Math.max(-maxPanAdjustment, Math.min(maxPanAdjustment, 
      panOffset * (totalTimeRange / width))) // 실시간 panOffset 사용
    const viewCenterTime = scrollbarCenterTime + realtimePanAdjustment
    const viewStartTime = viewCenterTime - scrollbarZoomedTimeRange / 2
    
    const indicatorPosition = ((viewStartTime - minDate.getTime()) / totalTimeRange) * width
    const clampedIndicatorPosition = Math.max(0, Math.min(width - indicatorWidth, indicatorPosition))

    // Navigation indicator (minimal line segment)
    const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    indicator.setAttribute('x1', clampedIndicatorPosition.toString())
    indicator.setAttribute('y1', (navY - 1).toString())
    indicator.setAttribute('x2', (clampedIndicatorPosition + indicatorWidth).toString())
    indicator.setAttribute('y2', (navY - 1).toString())
    indicator.setAttribute('stroke', '#374151')
    indicator.setAttribute('stroke-width', '3')
    indicator.setAttribute('opacity', '0.8')
    indicator.setAttribute('cursor', isNavDragging ? 'grabbing' : 'grab')
    navGroup.appendChild(indicator)
    
    // Set navigation group cursor
    navGroup.setAttribute('cursor', isNavDragging ? 'grabbing' : 'grab')

    // Navigation interaction is now handled at React level

    // Axis titles removed for cleaner design

    // Legend removed - now displayed in the resizer bar

  }, [dimensions, mainVisualizationData, isMobileScreen, isInitialized, debouncedZoomLevel, debouncedPanOffset, zoomLevel, panOffset])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-error">Error occurred</p>
          <p className="text-body-small mt-2">{error}</p>
        </div>
      </div>
    )
  }

  if (!proposalData) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600">No data available.</p>
      </div>
    )
  }

  const mainVizData = mainVisualizationData?.data

  return (
    <div className="h-full flex flex-col">
      {/* 메인 콘텐츠 영역 - 헤더 바 제거로 전체 공간 활용 */}
      <div className="flex-1 overflow-hidden relative">
        <div 
          ref={containerRef} 
          className={`w-full h-full p-4 lg:p-6 ${isDragging || isNavDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ userSelect: 'none' }}
          onWheel={handleWheel}
          onMouseDown={handleChartMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          {!isInitialized && loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">Initializing chart...</p>
          </div>
        </div>
          ) : mainVizData && mainVizData.length > 0 ? (
            <>
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                className="overflow-visible"
                onClick={handleNavClick}
              />
              {/* Custom Tooltip */}
              {tooltip.visible && (
                <div
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y - 10,
                    transform: 'translate(-50%, -100%)'
                  }}
                  dangerouslySetInnerHTML={{ __html: tooltip.content }}
                />
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-700">
              No proposals match the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 