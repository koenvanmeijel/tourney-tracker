export interface MarkerColor {
  /** Hex value stored on the record and used as the marker's background. */
  value: string;
  label: string;
  /** Text/content color that reads clearly on `value` — picked by hand per
   * swatch (same approach as EVENT_TYPE_THEME) rather than computed, since
   * the palette is small and fixed. */
  onColor: string;
}

export const MARKER_COLORS: MarkerColor[] = [
  { value: '#2f95dc', label: 'Blue', onColor: '#FFFFFF' },
  { value: '#2FA98C', label: 'Teal', onColor: '#FFFFFF' },
  { value: '#6D4AB8', label: 'Purple', onColor: '#FFFFFF' },
  { value: '#E3B341', label: 'Gold', onColor: '#2B2108' },
  { value: '#D9534F', label: 'Red', onColor: '#FFFFFF' },
  { value: '#4F8A3D', label: 'Green', onColor: '#FFFFFF' },
  { value: '#C2569B', label: 'Pink', onColor: '#FFFFFF' },
  { value: '#23262F', label: 'Black', onColor: '#F7F7F8' },
];

export const DEFAULT_MARKER_COLOR = MARKER_COLORS[0].value;

export function getMarkerOnColor(color: string): string {
  return MARKER_COLORS.find((swatch) => swatch.value === color)?.onColor ?? '#FFFFFF';
}
