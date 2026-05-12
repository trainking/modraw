export function getTextElementSize(text: string, fontSize: number) {
  const lines = (text || 'Text').split(/\r?\n/)
  const maxChars = Math.max(1, ...lines.map((line) => line.length))

  return {
    width: Math.max(24, Math.ceil(maxChars * fontSize * 0.62)),
    height: Math.max(fontSize, Math.ceil(lines.length * fontSize * 1.25))
  }
}
