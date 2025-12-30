import { useEffect, useState } from 'react'

/**
 * Hook that calculates an optimal zoom scale for desktop displays
 * to fill vertical space and avoid large unused areas.
 *
 * The scale is calculated based on viewport height relative to a
 * "base" design height. On mobile/smaller screens, no scaling is applied.
 */
export const useDesktopScale = () => {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const calculateScale = () => {
      // Only apply scaling on desktop-width screens
      const isDesktop = window.innerWidth >= 768
      if (!isDesktop) {
        setScale(1)
        return
      }

      const viewportHeight = window.innerHeight

      // Base design height - the viewport height at which scale = 1
      // This is approximately the height where the game looks "designed for"
      const baseHeight = 700

      // Calculate scale to fill viewport
      // Scale up when viewport is larger than base
      const rawScale = viewportHeight / baseHeight

      // Clamp between reasonable bounds:
      // - Min 1.0: never shrink below natural size
      // - Max 1.6: don't scale too large (text becomes chunky)
      const clampedScale = Math.max(1, Math.min(1.6, rawScale))

      setScale(clampedScale)
    }

    // Calculate initially
    calculateScale()

    // Recalculate on resize
    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [])

  return scale
}
