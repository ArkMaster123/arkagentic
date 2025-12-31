// Icon mapping utilities for replacing emojis with Lucide-style SVG icons

// Map emojis to Lucide icon SVG paths and names
export const EMOJI_TO_ICON_DATA: Record<string, { name: string; svg: string }> = {
  '🔍': {
    name: 'search',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`
  },
  '🧙': {
    name: 'brain',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2h5Z"/><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2h5Z"/><path d="M7 10h.01"/><path d="M11 10h.01"/><path d="M7 14h.01"/><path d="M11 14h.01"/><path d="M7 18h.01"/><path d="M11 18h.01"/></svg>`
  },
  '✍️': {
    name: 'pen-tool',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`
  },
  '📈': {
    name: 'trending-up',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 9.5 11.5 1 19"/><polyline points="17 6 23 6 23 12"/></svg>`
  },
  '👋': {
    name: 'user',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
  },
  '💭': {
    name: 'message-circle',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>`
  },
};

// Get complete SVG string for an emoji (for HTML/CSS rendering)
export function getIconSVG(emoji: string, size: number = 16): string {
  const iconData = EMOJI_TO_ICON_DATA[emoji];
  if (!iconData) return '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-${iconData.name}">${iconData.svg.replace('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">', '').replace('</svg>', '')}</svg>`;
}

// Get HTML span with icon class for CSS-based rendering
export function getIconSpan(emoji: string, size: number = 16): string {
  const iconData = EMOJI_TO_ICON_DATA[emoji];
  if (!iconData) return '';

  return `<span class="lucide-icon lucide-${iconData.name}" style="width: ${size}px; height: ${size}px; display: inline-block;"></span>`;
}

// Get icon name for CSS classes
export function getIconName(emoji: string): string {
  const iconData = EMOJI_TO_ICON_DATA[emoji];
  return iconData ? iconData.name : 'unknown';
}

// Get just the SVG path content (for Phaser custom rendering)
export function getIconPath(emoji: string): string {
  const iconData = EMOJI_TO_ICON_DATA[emoji];
  return iconData ? iconData.svg : '';
}
