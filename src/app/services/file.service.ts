import { Injectable } from '@angular/core';
import * as mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use local copy from assets
pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.mjs';

@Injectable({
  providedIn: 'root'
})
export class FileService {

  async extractTextFromFile(file: File): Promise<string> {
    const fileType = file.type;

    if (fileType === 'application/pdf') {
      return await this.extractTextFromPDF(file);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      return await this.extractTextFromWord(file);
    } else if (fileType === 'text/plain') {
      return await this.extractTextFromTxt(file);
    } else {
      throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT file.');
    }
  }

  private async extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText.trim();
  }

  private async extractTextFromWord(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  private async extractTextFromTxt(file: File): Promise<string> {
    return await file.text();
  }

  downloadAsPDF(text: string, filename: string = 'resume-rewritten.pdf') {
    const doc = new jsPDF();

    // Split text into lines that fit the page width
    const pageWidth = doc.internal.pageSize.getWidth();
    const margins = 20;
    const maxLineWidth = pageWidth - (margins * 2);

    const lines = doc.splitTextToSize(text, maxLineWidth);

    let yPosition = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.getHeight();

    lines.forEach((line: string) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, margins, yPosition);
      yPosition += lineHeight;
    });

    doc.save(filename);
  }
}
