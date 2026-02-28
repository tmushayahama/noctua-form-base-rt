// Material Design color palettes used by the Angular project via MatColors.
// Only the colors/hues actually used by shapes are included.

const palettes: Record<string, Record<number, string>> = {
  green: {
    50: '#e8f5e9',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    500: '#4caf50',
    600: '#43a047',
    800: '#2e7d32',
  },
  red: {
    100: '#ffcdd2',
    200: '#ef9a9a',
    500: '#f44336',
    600: '#e53935',
    800: '#c62828',
  },
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    500: '#9e9e9e',
    600: '#757575',
    800: '#424242',
  },
  amber: {
    100: '#ffecb3',
    200: '#ffe082',
    300: '#ffd54f',
    500: '#ffc107',
    800: '#ff8f00',
  },
  yellow: {
    50: '#fffde7',
    100: '#fff9c4',
    200: '#fff59d',
    500: '#ffeb3b',
    800: '#f9a825',
  },
  orange: {
    100: '#ffe0b2',
    200: '#ffcc80',
    500: '#ff9800',
    800: '#ef6c00',
  },
  blue: {
    100: '#bbdefb',
    200: '#90caf9',
    500: '#2196f3',
    600: '#1e88e5',
    800: '#1565c0',
  },
  purple: {
    100: '#e1bee7',
    200: '#ce93d8',
    500: '#9c27b0',
    600: '#8e24aa',
    800: '#6a1b9a',
  },
  brown: {
    100: '#d7ccc8',
    200: '#bcaaa4',
    500: '#795548',
    600: '#6d4c41',
    800: '#4e342e',
  },
}

export function getColor(color: string, hue: number): string | null {
  const palette = palettes[color]
  if (palette) {
    return palette[hue] ?? null
  }
  return null
}
