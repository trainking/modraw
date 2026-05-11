import { Camera } from '../types'

export function screenToScene(
  screenX: number,
  screenY: number,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const x = (screenX - canvasWidth / 2) / camera.zoom + camera.x
  const y = (screenY - canvasHeight / 2) / camera.zoom + camera.y
  return { x, y }
}

export function sceneToScreen(
  sceneX: number,
  sceneY: number,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const x = (sceneX - camera.x) * camera.zoom + canvasWidth / 2
  const y = (sceneY - camera.y) * camera.zoom + canvasHeight / 2
  return { x, y }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
