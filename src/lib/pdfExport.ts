import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  isWatermarkFree?: boolean;
}

/**
 * Downloads a DOM element as a high-fidelity vector/raster A4 PDF document.
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

  try {
    // Uploaded HTML templates render in a script-disabled sandboxed iframe.
    // Capture its document body when accessible so custom layouts are included in PDF export.
    const templateFrame = element.querySelector('iframe') as HTMLIFrameElement | null;
    const captureElement = templateFrame?.contentDocument?.body || element;
    // Generate high resolution canvas (scale: 2 for 300DPI crispness)
    const canvas = await html2canvas(captureElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    
    if (!isWatermarkFree) {
      pdf.setFontSize(8);
      pdf.setTextColor(160, 160, 160);
      pdf.text('Created with JOEASSIST (Free Edition) • Upgrade to remove watermark', 10, pageHeight - 5);
    }
    
    heightLeft -= pageHeight;

    // Multi-page slicing if document content exceeds single A4 page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);

      if (!isWatermarkFree) {
        pdf.setFontSize(8);
        pdf.setTextColor(160, 160, 160);
        pdf.text('Created with JOEASSIST (Free Edition) • Upgrade to remove watermark', 10, pageHeight - 5);
      }

      heightLeft -= pageHeight;
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Do not call window.print here: that would print the entire application UI.
    // The calling document page can offer its dedicated print-only action instead.
    return false;
  }
}
