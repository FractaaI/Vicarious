export const PALETTE_COLORS = [
  '#44403c', '#5d5f5d', '#747878', '#3b82f6', '#ef4444', 
  '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'
];

export const getAdaptiveColor = (hex: string, isDarkMode: boolean) => {
  if (!isDarkMode) return hex;
  const map: Record<string, string> = {
    '#44403c': '#ffffff', // Less Dark Black -> White
    '#000000': '#ffffff', // Just in case an old black is there
    '#5d5f5d': '#d4d4d8', // Dark Grey -> Zinc 300
    '#747878': '#a1a1aa', // Med Grey -> Zinc 400
    '#3b82f6': '#60a5fa', // Blue 500 -> 400
    '#ef4444': '#f87171', // Red 500 -> 400
    '#10b981': '#34d399', // Emerald 500 -> 400
    '#f59e0b': '#fbbf24', // Amber 500 -> 400
    '#8b5cf6': '#a78bfa', // Violet 500 -> 400
    '#ec4899': '#f472b6', // Pink 500 -> 400
    '#64748b': '#94a3b8', // Slate 500 -> 400
  };
  return map[hex.toLowerCase()] || hex;
};

export const getContrastText = (bgHex: string) => {
  const cleanHex = bgHex.replace('#', '');
  if (cleanHex.length !== 6) return '#ffffff';
  
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Perceived brightness formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.65 ? '#171717' : '#ffffff';
};
