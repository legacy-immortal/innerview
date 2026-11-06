/** Shared color palette for waveform layers and other controls. */
export const DEFAULT_COLORS = [
  '#00D9FF',
  '#FF00FF',
  '#00FF88',
  '#FF8800',
  '#8800FF',
  '#FF0088',
];

export function rgbToHex(
  rgb: [number, number, number] | undefined
): string {
  if (!rgb || !Array.isArray(rgb) || rgb.length !== 3) {
    return '#FFFFFF';
  }
  const [r, g, b] = rgb.map((v) => Math.round(v * 255));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const normalizedHex = hex.startsWith('#')
    ? hex.toUpperCase()
    : `#${hex.toUpperCase()}`;
  const r = parseInt(normalizedHex.slice(1, 3), 16) / 255;
  const g = parseInt(normalizedHex.slice(3, 5), 16) / 255;
  const b = parseInt(normalizedHex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export type ThemePreset = {
  name: string;
  primaryColor1: string;
  primaryColor2: string;
  secondaryColor1: string;
  secondaryColor2: string;
  tertiaryColor1: string;
  tertiaryColor2: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: 'Ocean',
    primaryColor1: '#004A6B',
    primaryColor2: '#001A33',
    secondaryColor1: '#006699',
    secondaryColor2: '#003366',
    tertiaryColor1: '#0088CC',
    tertiaryColor2: '#000D1A',
  },
  {
    name: 'Sunset',
    primaryColor1: '#CC4400',
    primaryColor2: '#661100',
    secondaryColor1: '#FF6600',
    secondaryColor2: '#882200',
    tertiaryColor1: '#FF8833',
    tertiaryColor2: '#330000',
  },
  {
    name: 'Forest',
    primaryColor1: '#004422',
    primaryColor2: '#001100',
    secondaryColor1: '#006633',
    secondaryColor2: '#002211',
    tertiaryColor1: '#008844',
    tertiaryColor2: '#000000',
  },
  {
    name: 'Neon',
    primaryColor1: '#FF00FF',
    primaryColor2: '#0000FF',
    secondaryColor1: '#FF33FF',
    secondaryColor2: '#0033FF',
    tertiaryColor1: '#FF66FF',
    tertiaryColor2: '#0066FF',
  },
  {
    name: 'Aurora',
    primaryColor1: '#6600CC',
    primaryColor2: '#330066',
    secondaryColor1: '#8800FF',
    secondaryColor2: '#440099',
    tertiaryColor1: '#AA33FF',
    tertiaryColor2: '#110033',
  },
  {
    name: 'Fire',
    primaryColor1: '#CC5500',
    primaryColor2: '#662200',
    secondaryColor1: '#FF7700',
    secondaryColor2: '#883300',
    tertiaryColor1: '#FF9933',
    tertiaryColor2: '#331100',
  },
  {
    name: 'Midnight',
    primaryColor1: '#3300CC',
    primaryColor2: '#110066',
    secondaryColor1: '#4400FF',
    secondaryColor2: '#220099',
    tertiaryColor1: '#6633FF',
    tertiaryColor2: '#000033',
  },
  {
    name: 'Spring',
    primaryColor1: '#8844AA',
    primaryColor2: '#442266',
    secondaryColor1: '#AA66CC',
    secondaryColor2: '#663388',
    tertiaryColor1: '#CC88DD',
    tertiaryColor2: '#221133',
  },
  {
    name: 'Cyber',
    primaryColor1: '#00CC44',
    primaryColor2: '#0033AA',
    secondaryColor1: '#00FF66',
    secondaryColor2: '#0066DD',
    tertiaryColor1: '#33FF88',
    tertiaryColor2: '#0044BB',
  },
  {
    name: 'Violet',
    primaryColor1: '#7700CC',
    primaryColor2: '#330066',
    secondaryColor1: '#9900FF',
    secondaryColor2: '#550099',
    tertiaryColor1: '#BB33FF',
    tertiaryColor2: '#110033',
  },
  {
    name: 'Blue-Yellow',
    primaryColor1: '#0033AA',
    primaryColor2: '#001166',
    secondaryColor1: '#0044DD',
    secondaryColor2: '#002288',
    tertiaryColor1: '#CCAA00',
    tertiaryColor2: '#665500',
  },
  {
    name: 'Cyan-Orange',
    primaryColor1: '#00AACC',
    primaryColor2: '#004466',
    secondaryColor1: '#00DDFF',
    secondaryColor2: '#006688',
    tertiaryColor1: '#FF6600',
    tertiaryColor2: '#883300',
  },
  {
    name: 'Teal-Purple',
    primaryColor1: '#00AAAA',
    primaryColor2: '#004444',
    secondaryColor1: '#00DDDD',
    secondaryColor2: '#006666',
    tertiaryColor1: '#8800CC',
    tertiaryColor2: '#440066',
  },
  {
    name: 'Solarized',
    primaryColor1: '#268bd2',
    primaryColor2: '#2aa198',
    secondaryColor1: '#859900',
    secondaryColor2: '#b58900',
    tertiaryColor1: '#cb4b16',
    tertiaryColor2: '#dc322f',
  },
  {
    name: 'Selenized',
    primaryColor1: '#3b90db',
    primaryColor2: '#248bd2',
    secondaryColor1: '#1e66f5',
    secondaryColor2: '#2060d0',
    tertiaryColor1: '#5b5bd6',
    tertiaryColor2: '#6b6bc6',
  },
  {
    name: 'Monochrome',
    primaryColor1: '#FFFFFF',
    primaryColor2: '#000000',
    secondaryColor1: '#CCCCCC',
    secondaryColor2: '#333333',
    tertiaryColor1: '#EEEEEE',
    tertiaryColor2: '#111111',
  },
  {
    name: 'Hal',
    primaryColor1: '#CC0000',
    primaryColor2: '#330000',
    secondaryColor1: '#FF0000',
    secondaryColor2: '#660000',
    tertiaryColor1: '#FF3333',
    tertiaryColor2: '#110000',
  },
];
