import { saveAs } from 'file-saver'
import { toPng } from 'html-to-image'

interface SavePngOptions {
  openPreviewOnMobile?: boolean
}

export type SavePngResult = 'download' | 'share' | 'preview'

function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }

  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}

export async function saveNodeAsPng(
  node: HTMLElement,
  fileName: string,
  options: SavePngOptions = {},
): Promise<SavePngResult> {
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#fffef8',
  })

  const blob = await dataUrlToBlob(dataUrl)
  const file = new File([blob], fileName, { type: 'image/png' })

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
    if (canShare) {
      await navigator.share({ files: [file], title: fileName })
      return 'share'
    }
  }

  saveAs(blob, fileName)

  if (options.openPreviewOnMobile !== false && isMobileBrowser() && typeof window !== 'undefined') {
    window.open(dataUrl, '_blank', 'noopener,noreferrer')
    return 'preview'
  }

  return 'download'
}
