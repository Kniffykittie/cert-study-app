// Wrap user-supplied text for injection into an AI prompt as data.
// Strips any <user_input>/</user_input> tags from the content first so a user
// can't break out of the data envelope by typing a closing tag, then caps
// length and wraps. Use everywhere user free text enters a prompt.
export function wrapUserInput(text, maxLen = 1000) {
  const stripped = String(text ?? '').replace(/<\/?user_input>/gi, '')
  return `<user_input>${stripped.slice(0, maxLen)}</user_input>`
}

// Sanitize a plain string that goes into a prompt but is NOT wrapped in tags
// (e.g. contextual fields the client echoes back) — removes the tag sequence
// so it can't inject a fake envelope, and caps length.
export function sanitizeForPrompt(text, maxLen = 2000) {
  return String(text ?? '').replace(/<\/?user_input>/gi, '').slice(0, maxLen)
}
