import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  isWatermarkFree?: boolean;
}

/** Wait for an uploaded srcDoc iframe to finish loading its document and resources. */
async function waitForIframeReady(frame: HTMLIFrameElement, timeoutMs = 15000): Promise<Document> {
  const getDocument = () => {
    try {
      return frame.contentDocument;
    } catch {
      return null;
    }
  };
  let doc = getDocument();
  if (!doc) {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('The uploaded CV preview is still loading. Please wait a moment and try again.'));
      }, timeoutMs);
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        window.clearTimeout(timer);
        frame.removeEventListener('load', onLoad);
      };
      frame.addEventListener('load', onLoad, { once: true });
      // Handle the case where the document became available just before listener registration.
      if (getDocument()) {
        cleanup();
        resolve();
      }
    });
    doc = getDocument();
  }

  if (!doc?.body) {
    throw new Error('The uploaded CV preview has not finished loading. Please wait a moment and try again.');
  }

  if (doc.readyState !== 'complete') {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('The uploaded CV styles are taking too long to load. Please wait and try again.'));
      }, timeoutMs);
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        window.clearTimeout(timer);
        doc?.defaultView?.removeEventListener('load', onLoad);
      };
      doc?.defaultView?.addEventListener('load', onLoad, { once: true });
      if (doc?.readyState === 'complete') {
        cleanup();
        resolve();
      }
    });
  }

  if (doc.fonts?.ready) await doc.fonts.ready;
  await Promise.all(Array.from(doc.images).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>(resolve => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
    });
  }));
  return doc;
}

const unsupportedColorFunctions = /(?:oklch|oklab|lch|lab|color-mix)\([^)]*\)/gi;

function oklchToRgb(value: string): string | null {
  const match = value.match(/oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+%?))?\s*\)/i);
  if (!match) return null;
  const Lraw = match[1];
  const L = Lraw.endsWith('%') ? parseFloat(Lraw) / 100 : parseFloat(Lraw);
  const C = parseFloat(match[2]);
  const h = (parseFloat(match[3]) * Math.PI) / 180;
  const alphaRaw = match[4];
  const alpha = alphaRaw ? (alphaRaw.endsWith('%') ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw)) : 1;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  // OKLCH -> OKLab -> linear sRGB -> sRGB.
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const ss = s_ * s_ * s_;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * ss,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * ss,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * ss,
  ];
  const channels = linear.map(channel => {
    const bounded = Math.max(0, Math.min(1, channel));
    const srgb = bounded <= 0.0031308 ? 12.92 * bounded : 1.055 * Math.pow(bounded, 1 / 2.4) - 0.055;
    return Math.round(srgb * 255);
  });
  return alpha < 1
    ? `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${Math.max(0, Math.min(1, alpha))})`
    : `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
}

function safeCssValue(property: string, value: string): string {
  const modernColor = value.match(/oklch\([^)]*\)/i);
  if (modernColor) {
    const converted = oklchToRgb(modernColor[0]);
    if (converted) return value.replace(modernColor[0], converted);
  }
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
    // Uploaded HTML (especially CDN-powered Tailwind templates) may create its
    // body before CSS/fonts/images finish loading. Wait before cloning for PDF.
    const frameDocument = frame ? await waitForIframeReady(frame) : null;
    const source = frameDocument?.body || element;

    staging = document.createElement('div');
    Object.assign(staging.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '210mm',
      minHeight: '297mm',
      height: 'auto',
      overflow: 'visible',
      transform: 'none',
      background: '#ffffff',
      zIndex: '2147483647',
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
      // Uploaded CVs are explicitly displayed inside a single A4 iframe. Keep
      // that page at A4 dimensions during capture instead of inheriting the
      // iframe body's viewport/min-height and accidentally creating blank pages.
      height: frameDocument ? '297mm' : 'auto',
      maxHeight: frameDocument ? '297mm' : 'none',
      margin: '0',
      transform: 'none',
      transformOrigin: 'top left',
      boxShadow: 'none',
      overflow: frameDocument ? 'hidden' : 'visible',
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
      height: frameDocument ? Math.ceil(297 * 96 / 25.4) : Math.max(clone.scrollHeight, clone.clientHeight),
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
