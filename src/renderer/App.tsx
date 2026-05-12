import { useEffect } from 'react'
import { useAppStore } from './stores/app'
import { useSceneStore } from './stores/scene'
import { WelcomeScreen } from './components/WelcomeScreen'
import { Canvas } from './components/Canvas'
import { TopBar } from './components/TopBar'
import { Footer } from './components/Footer'
import { PropertiesPanel } from './components/PropertiesPanel'
import { exportToPng, exportToSvg } from './core/export'
import { getRecentFileId } from './core/persistence'

export default function App() {
  const viewMode = useAppStore((s) => s.viewMode)
  const setCamera = useAppStore((s) => s.setCamera)

  // Restore last session
  useEffect(() => {
    const files = useSceneStore.getState().files
    const recentId = getRecentFileId()
    if (recentId && files.find((f) => f.id === recentId)) {
      useSceneStore.getState().setActiveFile(recentId)
      useAppStore.getState().setViewMode('editor')
    }
  }, [])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    const disposers = [
      api.onMenuNew(() => {
        useSceneStore.getState().createFile()
        useAppStore.getState().setViewMode('editor')
      }),
      api.onMenuZoomIn(() => {
        const { zoom } = useAppStore.getState().camera
        setCamera({ zoom: Math.min(zoom * 1.2, 10) })
      }),
      api.onMenuZoomOut(() => {
        const { zoom } = useAppStore.getState().camera
        setCamera({ zoom: Math.max(zoom / 1.2, 0.1) })
      }),
      api.onMenuZoomReset(() => setCamera({ zoom: 1, x: 0, y: 0 })),
      api.onMenuUndo(() => useSceneStore.getState().undo()),
      api.onMenuRedo(() => useSceneStore.getState().redo()),
      api.onMenuExportPng(() => exportToPng(useSceneStore.getState().getElements())),
      api.onMenuExportSvg(() => exportToSvg(useSceneStore.getState().getElements()))
    ]

    return () => disposers.forEach((dispose) => dispose())
  }, [setCamera])

  if (viewMode === 'welcome') {
    return <WelcomeScreen />
  }

  return (
    <div className="w-full h-full flex flex-col">
      <TopBar />
      <div className="flex-1 flex relative overflow-hidden">
        <Canvas />
        <div className="absolute top-3 left-3 pointer-events-none z-50">
          <div className="pointer-events-auto">
            <PropertiesPanel />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
