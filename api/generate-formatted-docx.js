import OpenAI from 'openai';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

const openai = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: 'https://api.perplexity.ai'
});

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
    const { optimizedText, originalText } = req.body;

    if (!optimizedText) {
      return res.status(400).json({ error: 'Optimized text is required' });
    }

    // Parse the optimized text into structured sections
    const sections = parseResumeText(optimizedText);

    // Create DOCX document
    const doc = new Document({
      sections: [{
        properties: {},
        children: createDocumentParagraphs(sections)
      }]
    });

    // Generate the docx buffer
    const buffer = await Packer.toBuffer(doc);

    // Send as downloadable file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="optimized-resume.docx"');
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Error generating DOCX:', error);
    res.status(500).json({
      error: 'Failed to generate DOCX',
      details: error.message
    });
  }
}

function parseResumeText(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section headers (ALL CAPS or ending with colon)
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && trimmed.length < 50) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: trimmed, content: [] };
    } else if (trimmed.endsWith(':') && trimmed.split(' ').length <= 3) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: trimmed.replace(':', ''), content: [] };
    } else if (currentSection) {
      currentSection.content.push(trimmed);
    } else {
      // Content before first section
      if (!currentSection) {
        currentSection = { title: '', content: [] };
      }
      currentSection.content.push(trimmed);
    }
  }

  if (currentSection) sections.push(currentSection);
  return sections;
}

function createDocumentParagraphs(sections) {
  const paragraphs = [];

  for (const section of sections) {
    // Add section title
    if (section.title) {
      paragraphs.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          thematicBreak: false
        })
      );
    }

    // Add section content
    for (const line of section.content) {
      // Check if it's a bullet point
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        paragraphs.push(
          new Paragraph({
            text: line.replace(/^[•\-*]\s*/, ''),
            bullet: { level: 0 },
            spacing: { before: 60, after: 60 }
          })
        );
      } else {
        paragraphs.push(
          new Paragraph({
            text: line,
            spacing: { before: 60, after: 60 }
          })
        );
      }
    }

    // Add space after section
    paragraphs.push(new Paragraph({ text: '', spacing: { before: 120 } }));
  }

  return paragraphs;
}
