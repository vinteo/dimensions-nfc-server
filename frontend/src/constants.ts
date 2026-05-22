import type { CharacterPreset, ColorPreset } from './types.js';

export const CHARACTER_PRESETS: CharacterPreset[] = [
  { name: 'Batman', id: '041285A2E23E80', type: 'Starter' },
  { name: 'Gandalf', id: '045B82A2E23E80', type: 'Starter' },
  { name: 'Wyldstyle', id: '041F85A2E23E80', type: 'Starter' },
  { name: 'Chell (Portal)', id: '045286A2E23E80', type: 'Level Pack' },
  { name: 'Doctor Who', id: '043F86A2E23E80', type: 'Level Pack' },
  { name: 'Sonic The Hedgehog', id: '042A86A2E23E80', type: 'Level Pack' },
  { name: 'Homer Simpson', id: '04E983A2E23E80', type: 'Level Pack' },
  { name: 'Scooby-Doo', id: '045C86A2E23E80', type: 'Team Pack' },
  { name: 'Vortex Mystery Tag', id: 'A1B2C3D4E5F677', type: 'Custom' },
];

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'Emerald Green', value: '#10b981' },
  { name: 'Amber Yellow', value: '#f59e0b' },
  { name: 'Vibrant Cyan', value: '#06b6d4' },
  { name: 'Neon Pink', value: '#ec4899' },
  { name: 'Electric Purple', value: '#a855f7' },
  { name: 'Crimson Red', value: '#ef4444' },
];
