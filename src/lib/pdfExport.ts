import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  isWatermarkFree?: boolean;
}

/**
 * Export only the CV document to an A4 PDF. The editor and its controls are
 * never captured. Long CVs are sliced into correctly sized A4 pages.
 */
export async function exportElementToPDF(
  elementId: string,
  options: PDFExportOptions = {}
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Export PDF failed: element #${elementId} not found`);
    return false;
  }

  const { filename = 'document.pdf', isWatermarkFree = true } = options;
  let staging: HTMLDivElement | null = null;

  try {
    // Uploaded HTML templates use an accessible same-origin iframe. Capture its
    // body when available; otherwise capture the regular React template element.
    const frame = element.querySelector('iframe') as HTMLIFrameElement | null;
    const source = frame?.contentDocument?.body || element;
    if (frame && !frame.contentDocument?.body) {
      throw new Error('The selected uploaded template has not finished loading. Please wait a moment and try again.');
    }

    staging = document.createElement('div');
    staging.setAttribute('aria-hidden', 'true');
    Object.assign(staging.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      width: '210mm',
      minHeight: '297mm',
      height: 'auto',
      overflow: 'visible',
      transform: 'none',
      background: '#ffffff',
      zIndex: '-1',
      pointerEvents: 'none',
    });

    const clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    Object.assign(clone.style, {
      width: '210mm',
      minWidth: '0',
      maxWidth: '210mm',
      minHeight: '297mm',
      height: 'auto',
      margin: '0',
      transform: 'none',
      transformOrigin: 'top left',
      boxShadow: 'none',
      overflow: 'visible',
      boxSizing: 'border-box',
      background: '#ffffff',
      color: '#111827',
    });
    staging.appendChild(clone);
    document.body.appendChild(staging);

    // Wait for fonts and images before rasterizing, when browser APIs are available.
    if ('fonts' in document) await document.fonts.ready;
    const images = Array.from(clone.querySelectorAll('img'));
    await Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }));

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      width: Math.max(clone.scrollWidth, clone.clientWidth),
      height: Math.max(clone.scrollHeight, clone.clientHeight),
      windowWidth: Math.max(794, clone.scrollWidth),
      scrollX: 0,
      scrollY: 0,
    });

    if (!canvas.width || !canvas.height) throw new Error('The CV preview is empty. Add your details and try exporting again.');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = 210;
    const pageHeight = 297;
    // Pixel height corresponding to one A4 page at the captured canvas scale.
    const pagePixelHeight = Math.floor(canvas.width * pageHeight / pageWidth);
    const pageCount = Math.max(1, Math.ceil(canvas.height / pagePixelHeight));

    for (let page = 0; page < pageCount; page++) {
      if (page > 0) pdf.addPage('a4', 'portrait');
      const startY = page * pagePixelHeight;
      const sliceHeight = Math.min(pagePixelHeight, canvas.height - startY);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = pagePixelHeight;
      const ctx = pageCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not prepare the PDF page.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, startY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

      if (!isWatermarkFree) {
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Created with JOEASSIST (Free Edition) • Upgrade to remove watermark', 10, pageHeight - 4);
      }
    }

    const safeName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safeName);
    return true;
  } catch (error) {
    console.error('Error generating CV PDF:', error);
    throw error;
  } finally {
    staging?.remove();
  }
}
