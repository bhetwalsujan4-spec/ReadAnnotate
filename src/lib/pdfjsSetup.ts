import * as pdfjsLib from 'pdfjs-dist'
// The ?url suffix makes Vite emit the worker as a separate asset and gives us
// its final built URL, which is what GlobalWorkerOptions.workerSrc needs.
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

export { pdfjsLib }
export type PdfDocumentProxy = pdfjsLib.PDFDocumentProxy
export type PdfPageProxy = pdfjsLib.PDFPageProxy
