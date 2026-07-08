import fontkit from '@pdf-lib/fontkit'
import {
  PDFDocument,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
  type Color,
} from 'pdf-lib'

interface PdfTemplateDocument {
  pdfDoc: PDFDocument
  page: PDFPage
  defaultFont: PDFFont
}

interface DrawTextOptions {
  pdfDoc: PDFDocument
  page: PDFPage
  text: string
  x: number
  y: number
  size: number
  color: Color
  font?: PDFFont
}

interface DrawCenteredTextOptions {
  pdfDoc: PDFDocument
  page: PDFPage
  text: string
  centerX: number
  y: number
  size: number
  color: Color
  font?: PDFFont
}

const canvasScale = 3

export async function loadPdfTemplate(templatePath: string): Promise<PdfTemplateDocument> {
  const response = await fetch(templatePath)

  if (!response.ok) {
    throw new Error(`Failed to load PDF template: ${templatePath}`)
  }

  const templateBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(templateBytes)
  pdfDoc.registerFontkit(fontkit)

  const [page] = pdfDoc.getPages()
  const defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  if (!page) {
    throw new Error('PDF template does not contain any pages')
  }

  return {
    pdfDoc,
    page,
    defaultFont,
  }
}

export async function embedFontFromPath(
  pdfDoc: PDFDocument,
  fontPath: string,
): Promise<PDFFont | null> {
  const response = await fetch(fontPath)
  const contentType = response.headers.get('content-type') ?? ''

  if (!response.ok || contentType.includes('text/html')) {
    return null
  }

  const fontBytes = await response.arrayBuffer()

  if (!isFontFile(fontBytes)) {
    return null
  }

  return pdfDoc.embedFont(fontBytes)
}

export async function drawCenteredText(options: DrawCenteredTextOptions): Promise<void> {
  const width = getTextWidth(options.text, options.size, options.font)
  await drawText({
    pdfDoc: options.pdfDoc,
    page: options.page,
    text: options.text,
    x: options.centerX - width / 2,
    y: options.y,
    size: options.size,
    color: options.color,
    font: options.font,
  })
}

export async function drawText(options: DrawTextOptions): Promise<void> {
  if (options.font && canDrawWithFont(options.font, options.text)) {
    options.page.drawText(options.text, {
      x: options.x,
      y: options.y,
      size: options.size,
      font: options.font,
      color: options.color,
    })
    return
  }

  if (!containsNonAscii(options.text)) {
    options.page.drawText(options.text, {
      x: options.x,
      y: options.y,
      size: options.size,
      font: options.font,
      color: options.color,
    })
    return
  }

  await drawTextAsImage(options)
}

export async function savePdfAsBlob(pdfDoc: PDFDocument): Promise<Blob> {
  const bytes = await pdfDoc.save()
  const arrayBuffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(arrayBuffer).set(bytes)

  return new Blob([arrayBuffer], { type: 'application/pdf' })
}

function getTextWidth(text: string, size: number, font?: PDFFont): number {
  if (font && canDrawWithFont(font, text)) {
    return font.widthOfTextAtSize(text, size)
  }

  return measureTextWithCanvas(text, size).width
}

function canDrawWithFont(font: PDFFont, text: string): boolean {
  try {
    font.widthOfTextAtSize(text, 12)
    return true
  } catch {
    return false
  }
}

function containsNonAscii(text: string): boolean {
  return /[^\u0000-\u007f]/u.test(text)
}

function measureTextWithCanvas(text: string, size: number): TextMetrics {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas 2D context is not available')
  }

  context.font = `${size}px "Noto Sans SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif`
  return context.measureText(text)
}

async function drawTextAsImage(options: DrawTextOptions): Promise<void> {
  const metrics = measureTextWithCanvas(options.text, options.size)
  const textWidth = Math.ceil(metrics.width)
  const textHeight = Math.ceil(
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || options.size,
  )
  const canvas = document.createElement('canvas')
  const padding = Math.ceil(options.size * 0.35)
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas 2D context is not available')
  }

  canvas.width = Math.max(1, (textWidth + padding * 2) * canvasScale)
  canvas.height = Math.max(1, (textHeight + padding * 2) * canvasScale)

  context.scale(canvasScale, canvasScale)
  context.font = `${options.size}px "Noto Sans SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif`
  context.fillStyle = colorToCss(options.color)
  context.textBaseline = 'alphabetic'
  context.fillText(options.text, padding, padding + metrics.actualBoundingBoxAscent)

  const imageBytes = await canvasToPngBytes(canvas)
  const image = await options.pdfDoc.embedPng(imageBytes)

  options.page.drawImage(image, {
    x: options.x - padding,
    y: options.y - padding,
    width: canvas.width / canvasScale,
    height: canvas.height / canvasScale,
  })
}

function colorToCss(color: Color): string {
  if (color.type !== 'RGB') {
    return '#1f2937'
  }

  const red = Math.round(color.red * 255)
  const green = Math.round(color.green * 255)
  const blue = Math.round(color.blue * 255)

  return `rgb(${red}, ${green}, ${blue})`
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })

  if (!blob) {
    throw new Error('Failed to render text image')
  }

  return new Uint8Array(await blob.arrayBuffer())
}

function isFontFile(fontBytes: ArrayBuffer): boolean {
  const bytes = new Uint8Array(fontBytes.slice(0, 4))
  const signature = String.fromCharCode(...bytes)

  return (
    signature === 'OTTO' ||
    signature === 'ttcf' ||
    (bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00)
  )
}

export const pdfEngineColors = {
  fallbackText: rgb(0.12, 0.14, 0.18),
} as const
