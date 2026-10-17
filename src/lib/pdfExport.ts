import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  isWatermarkFree?: boolean;
}

const unsupportedColorFunctions = /(?:oklch|oklab|lch|lab|color-mix)\([^)]*\)/gi;

function safeCssValue(property: string, value: string): string {
  if (!unsupportedColorFunctions.test(value)) {
    unsupportedColorFunctions.lastIndex = 0;
    return value;
  }
  unsupportedColorFunctions.lastIndex = 0;
  if (property === 'color' || property === 'fill' || property === 'stroke' || property.includes('border-color')) {
    return 'rgb(17, 24, 39)';
  }
  if (property.includes('background') || property === 'background') return 'rgb(255, 255, 255)';
  if (property.includes('shadow')) return 'none';
  return 'transparent';
}

/**
 * Copy computed styles as browser-resolved inline CSS before capture. This avoids
 * html2canvas parsing modern Tailwind oklch() tokens and preserves the actual CV layout.
 */
function inlineComputedStyles(source: Element, clone: Element): void {
  const sourceWindow = source.ownerDocument?.defaultView;
  if (sourceWindow) {
    const computed = sourceWindow.getComputedStyle(source);
    const style = (clone as HTMLElement | SVGElement).style;
    for (let i = 0; i < computed.length; i++) {
      const property = computed.item(i);
      if (!property || property.startsWith('--')) continue;
      const value = safeCssValue(property, computed.getPropertyValue(property));
      try {
        style.setProperty(property, value, computed.getPropertyPriority(property));
      } catch {
        // Ignore unsupported or read-only declarations.
      }
    }
  }

  // Classes can reintroduce Tailwind color functions when CSS is parsed, so keep
  // the resolved inline styles and remove class names from the export clone.
  clone.removeAttribute('class');
  const sourceChildren = Array.from(source.children);
  const cloneChildren = Array.from(clone.children);
  sourceChildren.forEach((child, index) => {
    const cloneChild = cloneChildren[index];
    if (cloneChild) inlineComputedStyles(child, cloneChild);
  });
}

/**
 * Export just the CV to A4. A document that fits the A4 preview is one page;
 * additional pages are created only when the actual content exceeds A4 height.
 */
export async function exportElementToPDF(
  elementId: string,
  options: PDFExportOptions = {},
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Export PDF failed: element #${elementId} not found`);
    return false;
  }

  const { filename = 'document.pdf', isWatermarkFree = true } = options;
  let staging: HTMLDivElement | null = null;

  try {
    const frame = element.querySelector('iframe') as HTMLIFrameElement | null;
    const source = frame?.contentDocument?.body || element;
    if (frame && !frame.contentDocument?.body) {
      throw new Error('The selected uploaded template has not finished loading. Please wait a moment and try again.');
    }

    staging = document.createElement('div');
    Object.assign(staging.style, {
      position: 'fixed',
      left: '-20000px',
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
    inlineComputedStyles(source, clone);
    clone.removeAttribute('id');
    Object.assign(clone.style, {
      width: '210mm',
      minWidth: '210mm',
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
      color: '#000000',
      position: 'relative',
    });

    // Uploaded templates use an iframe body as the source. Inline styles were
    // resolved in that iframe before the clone is placed in the main document.
    staging.appendChild(clone);
    document.body.appendChild(staging);

    if ('fonts' in document) await document.fonts.ready;
    await Promise.all(Array.from(clone.querySelectorAll('img')).map(img => {
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
      onclone: clonedDocument => {
        // Inline computed styles now carry the visual appearance; removing linked
        // stylesheets prevents html2canvas from parsing Tailwind's unsupported oklch().
        clonedDocument.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => node.remove());
        clonedDocument.querySelectorAll('*').forEach(node => {
          const htmlNode = node as HTMLElement;
          for (const property of Array.from(htmlNode.style)) {
            const value = htmlNode.style.getPropertyValue(property);
            htmlNode.style.setProperty(property, safeCssValue(property, value));
          }
        });
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('The CV preview is empty. Add your details and try exporting again.');
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = 210;
    const pageHeight = 297;
    const pagePixelHeight = Math.floor(canvas.width * pageHeight / pageWidth);
    // Browsers can rasterize a nominal 297mm page a pixel or two taller due
    // to fractional CSS-mm conversion. Do not turn that rounding into a blank page.
    const pageCount = Math.max(1, Math.ceil((canvas.height - 4) / pagePixelHeight));

    for (let page = 0; page < pageCount; page++) {
      if (page > 0) pdf.addPage('a4', 'portrait');
      const startY = page * pagePixelHeight;
      const sliceHeight = Math.min(pagePixelHeight, canvas.height - startY);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = pagePixelHeight;
      const context = pageCanvas.getContext('2d');
      if (!context) throw new Error('Could not prepare the PDF page.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      context.drawImage(canvas, 0, startY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

      if (!isWatermarkFree) {
        pdf.setFontSize(7);
        pdf.setTextColor(110, 110, 110);
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
