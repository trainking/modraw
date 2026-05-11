let counter = Math.floor(Date.now() / 1000) % 100000
export function generateId(): string {
  counter++
  const r = Math.random().toString(36).slice(2, 7)
  return `${counter}_${r}`
}
