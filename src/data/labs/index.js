import ccnaFundamentals from './ccna-fundamentals'
import smallOfficeNetwork from './small-office-network'
import { NETWORK_PLUS_LAB_SET } from './network-plus-fundamentals'
import { SECURITY_PLUS_LAB_SET } from './security-plus-labs'

export const LAB_SETS = [ccnaFundamentals, smallOfficeNetwork, NETWORK_PLUS_LAB_SET, SECURITY_PLUS_LAB_SET]

export function getLabSet(setId) {
  return LAB_SETS.find(s => s.id === setId) ?? null
}

export function getLab(setId, labId) {
  const set = getLabSet(setId)
  return set?.labs.find(l => l.id === labId) ?? null
}
