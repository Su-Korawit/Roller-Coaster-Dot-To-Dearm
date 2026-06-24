import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { MapScene, loadSceneData } from '../../game/worldScenes'

export default function MapPreview({ mapKey, width = '100%', height = 240 }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!mapKey || !containerRef.current) return
    let game = null
    let cancelled = false

    loadSceneData(mapKey).then((data) => {
      if (cancelled || !containerRef.current) return
      const { clientWidth, clientHeight } = containerRef.current
      const w = clientWidth || 400
      const h = typeof height === 'number' ? height : clientHeight || 240

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        pixelArt: true,
        antialias: false,
        width: w,
        height: h,
        backgroundColor: '#1a1a2e',
        physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
        scene: [MapScene],
      })
      game.registry.set('assetUrls', data.assetUrls)
      game.registry.set('mapConfig', data.mapConfig)
      game.registry.set('tilesetUrls', data.tilesetUrls)
      game.registry.set('mapObjects', [])
      game.registry.set('editMode', false)
      game.registry.set('remotePlayers', {})
      game.scene.start('MapScene', { mapKey, preview: true })
    }).catch((e) => { console.error('[MapPreview] load failed:', e) })

    return () => {
      cancelled = true
      if (game) { game.destroy(true); game = null }
    }
  }, [mapKey])   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ width, height: typeof height === 'number' ? height : height, overflow: 'hidden', borderRadius: 12, background: '#1a1a2e' }}
    />
  )
}
