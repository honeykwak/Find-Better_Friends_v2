// Vote option colors - Temperature-based spectrum for intuitive understanding
export const VOTE_COLORS = {
  // Strong support - Deep green
  YES: '#16a34a',
  
  // Opposition - Red  
  NO: '#dc2626',
  
  // Neutral/Abstain - Neutral gray
  ABSTAIN: '#64748b',
  
  // Strong opposition with veto - Dark red/Maroon
  NO_WITH_VETO: '#991b1b',
  
  // Did not participate (has voting rights but chose not to vote) - Light gray
  NO_VOTE: '#e2e8f0'
} as const

// 투표 옵션 타입 정의
export type VoteOption = keyof typeof VOTE_COLORS

// Vote option order (stack order in visualization) - Temperature-based spectrum with neutral grouping
export const VOTE_ORDER: VoteOption[] = ['YES', 'ABSTAIN', 'NO_VOTE', 'NO', 'NO_WITH_VETO']

// Vote option descriptions
export const VOTE_DESCRIPTIONS = {
  YES: 'YES',
  NO: 'NO', 
  ABSTAIN: 'ABSTAIN',
  NO_WITH_VETO: 'NO_WITH_VETO',
  NO_VOTE: 'NO_VOTE'
} as const

// Vote option meaning descriptions
export const VOTE_MEANINGS = {
  YES: 'Vote in favor of the proposal',
  NO: 'Vote against the proposal',
  ABSTAIN: 'Neutral stance, neither for nor against',
  NO_WITH_VETO: 'Strong rejection with veto power',
  NO_VOTE: 'Has voting rights but intentionally did not participate'
} as const

// Plotly color scale for ValidatorAnalysis - Array order matches value mapping
export const PLOTLY_COLOR_SCALE = [
  [0, `rgba(153, 27, 27, 0.8)`],      // Value 0: NO_WITH_VETO - Darkest red
  [0.25, `rgba(220, 38, 38, 0.8)`],   // Value 1: NO - Red  
  [0.5, `rgba(226, 232, 240, 0.8)`],  // Value 2: NO_VOTE - Light gray
  [0.75, `rgba(100, 116, 139, 0.8)`], // Value 3: ABSTAIN - Neutral gray
  [1, `rgba(22, 163, 74, 0.8)`]       // Value 4: YES - Darkest green
] as const

// Vote option numeric mapping (for heatmap) - Values should match color intensity
export const VOTE_VALUE_MAP: Record<VoteOption, number> = {
  YES: 4,          // Highest value - Strong support (darkest green)
  ABSTAIN: 3,      // Neutral - chose to abstain  
  NO_VOTE: 2,      // Neutral - chose not to participate
  NO: 1,           // Opposition (red)
  NO_WITH_VETO: 0  // Strong opposition (darkest red)
}

// Vote option RGBA colors (with transparency) - Must match VOTE_COLORS exactly
export const VOTE_COLORS_RGBA = {
  YES: 'rgba(22, 163, 74, 0.8)',      // Deep green - matches #16a34a
  NO: 'rgba(220, 38, 38, 0.8)',       // Red - matches #dc2626
  ABSTAIN: 'rgba(100, 116, 139, 0.8)', // Neutral gray - matches #64748b
  NO_WITH_VETO: 'rgba(153, 27, 27, 0.8)', // Dark red/Maroon - matches #991b1b
  NO_VOTE: 'rgba(226, 232, 240, 0.8)' // Light gray - matches #e2e8f0
} as const

// 범례용 색상 정보
export const LEGEND_ITEMS = VOTE_ORDER.map(option => ({
  option,
  color: VOTE_COLORS[option],
  label: VOTE_DESCRIPTIONS[option],
  description: VOTE_MEANINGS[option]
})) 