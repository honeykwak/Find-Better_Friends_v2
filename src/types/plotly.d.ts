declare module 'react-plotly.js' {
  import { Component } from 'react'
  
  interface PlotParams {
    data: any[]
    layout?: any
    config?: any
    style?: React.CSSProperties
    className?: string
    onInitialized?: (figure: any, graphDiv: HTMLElement) => void
    onUpdate?: (figure: any, graphDiv: HTMLElement) => void
    onPurge?: (figure: any, graphDiv: HTMLElement) => void
    onError?: (err: any) => void
    debug?: boolean
    useResizeHandler?: boolean
    onAfterExport?: () => void
    onAfterPlot?: () => void
    onAnimated?: () => void
    onAnimatingFrame?: (event: any) => void
    onAnimationInterrupted?: () => void
    onAutoSize?: () => void
    onBeforeExport?: () => void
    onButtonClicked?: (event: any) => void
    onClickAnnotation?: (event: any) => void
    onDeselect?: () => void
    onDoubleClick?: () => void
    onFramework?: () => void
    onHover?: (event: any) => void
    onLegendClick?: (event: any) => void
    onLegendDoubleClick?: (event: any) => void
    onRelayout?: (event: any) => void
    onRestyle?: (event: any) => void
    onRedraw?: () => void
    onSelected?: (event: any) => void
    onSelecting?: (event: any) => void
    onSliderChange?: (event: any) => void
    onSliderEnd?: (event: any) => void
    onSliderStart?: (event: any) => void
    onTransitioning?: () => void
    onTransitionInterrupted?: () => void
    onUnhover?: (event: any) => void
    onWebGlContextLost?: () => void
    revision?: number
    divId?: string
  }
  
  export default class Plot extends Component<PlotParams> {}
} 