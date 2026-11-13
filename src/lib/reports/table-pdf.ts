// Browser-side PDF of a simple table (title, a few summary lines, then rows),
// for "download what's on screen" buttons. jsPDF loads only when it's used.

export type TablePdfColumn = {
  label: string
  /** Relative width; columns share the page width in proportion. */
  weight?: number
  align?: 'left' | 'right'
}

export type TablePdfOptions = {
  filename: string
  title: string
  subtitle?: string
  /** Short lines printed under the title, e.g. totals. */
  summary?: string[]
  columns: TablePdfColumn[]
  rows: Array<Array<string | number>>
  orientation?: 'portrait' | 'landscape'
}

const MARGIN = 36
const ROW_HEIGHT = 20
const HEADER_HEIGHT = 22

export async function downloadTablePdf({
  filename,
  title,
  subtitle,
  summary = [],
  columns,
  rows,
  orientation = 'landscape',
}: TablePdfOptions) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const tableWidth = pageWidth - MARGIN * 2

  const totalWeight = columns.reduce((sum, column) => sum + (column.weight ?? 1), 0)
  const widths = columns.map((column) => ((column.weight ?? 1) / totalWeight) * tableWidth)
  const lefts = widths.map((_, index) => MARGIN + widths.slice(0, index).reduce((a, b) => a + b, 0))

  // Shorten a cell with an ellipsis so it never runs into the next column.
  const fit = (text: string, width: number) => {
    const room = width - 10
    if (doc.getTextWidth(text) <= room) return text
    let cut = text
    while (cut.length > 1 && doc.getTextWidth(`${cut}…`) > room) cut = cut.slice(0, -1)
    return `${cut}…`
  }

  const drawCell = (text: string, index: number, y: number) => {
    const column = columns[index]
    const value = fit(text, widths[index])
    if (column.align === 'right') {
      doc.text(value, lefts[index] + widths[index] - 5, y, { align: 'right' })
    } else {
      doc.text(value, lefts[index] + 5, y)
    }
  }

  const drawHeader = (y: number) => {
    doc.setFillColor(243, 244, 246)
    doc.rect(MARGIN, y, tableWidth, HEADER_HEIGHT, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(75, 85, 99)
    columns.forEach((column, index) => drawCell(column.label, index, y + 14))
    return y + HEADER_HEIGHT
  }

  // Title block
  let y = MARGIN + 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(17, 24, 39)
  doc.text(title, MARGIN, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  const generated = `Generated ${new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
  doc.text(subtitle ? `${subtitle} · ${generated}` : generated, MARGIN, y)
  y += 6
  if (summary.length > 0) {
    y += 10
    doc.setFontSize(9.5)
    doc.setTextColor(55, 65, 81)
    for (const line of summary) {
      doc.text(line, MARGIN, y)
      y += 13
    }
  }
  y += 8

  y = drawHeader(y)

  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text('No rows to show', MARGIN + 5, y + 14)
  }

  rows.forEach((row, rowIndex) => {
    if (y + ROW_HEIGHT > pageHeight - MARGIN) {
      doc.addPage()
      y = drawHeader(MARGIN)
    }
    if (rowIndex % 2 === 1) {
      doc.setFillColor(249, 250, 251)
      doc.rect(MARGIN, y, tableWidth, ROW_HEIGHT, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(17, 24, 39)
    row.forEach((cell, index) => drawCell(String(cell ?? ''), index, y + 13))
    y += ROW_HEIGHT
  })

  // Page numbers
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text(`Page ${page} of ${pages}`, pageWidth - MARGIN, pageHeight - 18, { align: 'right' })
  }

  doc.save(filename)
}
