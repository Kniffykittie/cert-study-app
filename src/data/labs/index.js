import ccnaFundamentals from './ccna-fundamentals'

export const LAB_SETS = [ccnaFundamentals]

export function getLabSet(setId) {
  return LAB_SETS.find(s => s.id === setId) ?? null
}

export function getLab(setId, labId) {
  const set = getLabSet(setId)
  return set?.labs.find(l => l.id === labId) ?? null
}
