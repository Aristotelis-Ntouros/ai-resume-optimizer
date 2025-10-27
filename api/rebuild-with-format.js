import OpenAI from 'openai';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import multiparty from 'multiparty';
import JSZip from 'jszip';

const openai = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: 'https://api.perplexity.ai'
});

export const config = {
  api: {
    bodyParser: false, // Disable default body parser to handle multipart/form-data
  },
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data
    const form = new multiparty.Form();

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const originalText = fields.originalText[0];
    const optimizedText = fields.optimizedText[0];
    const file = files.file[0];

    if (!file || !originalText || !optimizedText) {
      return res.status(400).json({ error: 'File, original text, and optimized text are required' });
    }

    // Read the file
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(file.path);
    const fileType = file.headers['content-type'] || file.originalFilename.split('.').pop();

    console.log('Processing file:', file.originalFilename, 'Type:', fileType);

    // Use AI to create intelligent text replacement mapping
    const mappingPrompt = `You are creating a text replacement map to update a resume while preserving its exact formatting.

ORIGINAL TEXT (what's currently in the document):
${originalText}

OPTIMIZED TEXT (what we want to put in):
${optimizedText}

Create a JSON array of replacements. Each replacement should:
1. Find a UNIQUE chunk of original text (3-20 words that appears only ONCE)
2. Map it to the corresponding optimized text
3. Be specific enough to avoid false matches
4. Cover ALL the meaningful content changes

Rules:
- Don't include formatting markers or special characters
- Focus on actual content (job descriptions, achievements, skills, etc.)
- Make each "find" string unique enough that it only matches once
- Keep replacements atomic (one concept per replacement)
- If text structure is very different, break into smaller pieces

Return ONLY valid JSON array:
[
  {
    "find": "exact text to find in original",
    "replace": "new optimized text"
  }
]

Aim for 10-30 replacements to cover the main changes.`;

    console.log('Requesting AI mapping...');

    const completion = await openai.chat.completions.create({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating precise text replacement mappings. Always return valid JSON arrays only, no explanations.'
        },
        {
          role: 'user',
          content: mappingPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 3000
    });

    const mappingText = completion.choices[0].message.content;
    console.log('AI Response:', mappingText.substring(0, 200));

    // Extract JSON array from response
    const jsonMatch = mappingText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in AI response');
      throw new Error('Failed to generate replacement mapping');
    }

    const replacements = JSON.parse(jsonMatch[0]);
    console.log(`Generated ${replacements.length} replacements`);

    let outputBuffer;

    // Handle based on file type
    if (fileType.includes('pdf') || file.originalFilename.endsWith('.pdf')) {
      console.log('Processing as PDF...');
      outputBuffer = await processPDF(fileBuffer, replacements);
    } else if (fileType.includes('wordprocessing') || file.originalFilename.endsWith('.docx')) {
      console.log('Processing as DOCX...');
      outputBuffer = await processDOCX(fileBuffer, replacements);
    } else {
      throw new Error('Unsupported file type. Please use PDF or DOCX.');
    }

    // Clean up temp file
    fs.unlinkSync(file.path);

    // Send the rebuilt file
    res.setHeader('Content-Type', file.headers['content-type']);
    res.setHeader('Content-Disposition', `attachment; filename="optimized_${file.originalFilename}"`);
    res.send(outputBuffer);

  } catch (error) {
    console.error('Error rebuilding document:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to rebuild document',
      details: error.message
    });
  }
}

async function processPDF(fileBuffer, replacements) {
  // For PDFs, we create a "Change Guide" document that shows what to update
  // This is because direct PDF text editing destroys formatting

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595, 842]); // A4 size
  let yPosition = 800;
  const margin = 50;
  const lineHeight = 20;

  // Title
  page.drawText('Resume Update Guide', {
    x: margin,
    y: yPosition,
    size: 18,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.8),
  });

  yPosition -= 30;

  page.drawText('Follow these changes to update your original PDF:', {
    x: margin,
    y: yPosition,
    size: 12,
    font,
  });

  yPosition -= 30;

  // Add each replacement as an instruction
  for (let i = 0; i < replacements.length; i++) {
    const replacement = replacements[i];

    // Check if we need a new page
    if (yPosition < 100) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = 800;
    }

    // Change number
    page.drawText(`Change ${i + 1}:`, {
      x: margin,
      y: yPosition,
      size: 11,
      font: boldFont,
      color: rgb(0.8, 0.2, 0.2),
    });

    yPosition -= lineHeight;

    // Find this text
    const findText = `FIND: "${replacement.find.substring(0, 80)}${replacement.find.length > 80 ? '...' : ''}"`;
    page.drawText(findText, {
      x: margin + 10,
      y: yPosition,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    yPosition -= lineHeight;

    // Replace with
    const replaceText = `REPLACE WITH: "${replacement.replace.substring(0, 70)}${replacement.replace.length > 70 ? '...' : ''}"`;
    page.drawText(replaceText, {
      x: margin + 10,
      y: yPosition,
      size: 9,
      font,
      color: rgb(0.2, 0.6, 0.2),
    });

    yPosition -= lineHeight + 5;
  }

  // Add footer
  if (yPosition < 100) {
    page = pdfDoc.addPage([595, 842]);
    yPosition = 800;
  }

  yPosition -= 20;
  page.drawText('💡 Tip: Open your original PDF in Adobe Acrobat or similar editor', {
    x: margin,
    y: yPosition,
    size: 10,
    font: boldFont,
  });

  yPosition -= lineHeight;
  page.drawText('and use Find & Replace to apply these changes automatically.', {
    x: margin,
    y: yPosition,
    size: 10,
    font,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function processDOCX(fileBuffer, replacements) {
  try {
    // Load the DOCX as a ZIP
    const zip = await JSZip.loadAsync(fileBuffer);

    // Get the main document XML (this contains the text content)
    const documentXml = await zip.file('word/document.xml').async('string');

    console.log('Original DOCX XML length:', documentXml.length);

    // Apply each replacement in the XML
    // We need to be careful to only replace text content, not XML tags
    let modifiedXml = documentXml;

    for (const replacement of replacements) {
      // Escape special XML characters in the replacement text
      const replaceXmlSafe = replacement.replace
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      // Find and replace the text in XML content
      // Text in DOCX XML is inside <w:t> tags
      // We need to handle cases where text might be split across multiple <w:t> tags

      const findXmlSafe = replacement.find
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      // Simple replacement - this works if text isn't split across tags
      const beforeLength = modifiedXml.length;
      modifiedXml = modifiedXml.replace(
        new RegExp(escapeRegex(findXmlSafe), 'g'),
        replaceXmlSafe
      );

      if (modifiedXml.length !== beforeLength) {
        console.log(`✓ Applied: "${replacement.find.substring(0, 40)}..." -> "${replacement.replace.substring(0, 40)}..."`);
      }
    }

    console.log('Modified DOCX XML length:', modifiedXml.length);

    // Update the document.xml in the ZIP
    zip.file('word/document.xml', modifiedXml);

    // Generate the new DOCX file
    const newDocxBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    console.log('✓ DOCX rebuilt successfully with preserved formatting');

    return newDocxBuffer;

  } catch (error) {
    console.error('Error processing DOCX:', error);
    throw error;
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
