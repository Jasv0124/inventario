export const SEDES = [
  { value: 'galapa', label: 'Galapa' },
  { value: 'arenosa', label: 'Arenosa' },
  { value: 'itagui', label: 'Itagui' },
  { value: 'cartagena', label: 'Cartagena' },
];

export const DEFAULT_SEDE = 'galapa';

const EMAIL_SEDE_MAP = {
  'lauracant@gmail.com': 'galapa',
};

export function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

export function getFallbackSedeByEmail(email) {
  return EMAIL_SEDE_MAP[normalizeEmail(email)] || '';
}

export function getSedeLabel(sede) {
  return SEDES.find(item => item.value === sede)?.label || sede || 'Sin sede';
}

export function buildUserDisplayName(nombre, sede) {
  return `${nombre.trim()} [sede:${sede}]`;
}

export function getCleanDisplayName(displayName = '') {
  return displayName.replace(/\s*\[sede:[^\]]+\]\s*$/i, '').trim();
}

export function getSedeFromDisplayName(displayName = '') {
  const match = displayName.match(/\[sede:([^\]]+)\]\s*$/i);
  return match?.[1] || '';
}
