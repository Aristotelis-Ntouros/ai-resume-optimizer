import OpenAI from 'openai';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

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
    const { originalText, optimizedText, fileType } = req.body;

    if (!originalText || !optimizedText) {
      return res.status(400).json({ error: 'Original and optimized text are required' });
    }

    // Use AI to create a mapping between original and optimized content
    const mappingPrompt = `You are helping to preserve CV formatting while applying optimized content.

ORIGINAL CV TEXT:
${originalText}

OPTIMIZED CV TEXT:
${optimizedText}

Your task: Create a JSON mapping that shows how to replace content in the original with optimized content, PRESERVING THE EXACT STRUCTURE.

Rules:
1. Identify distinct sections (e.g., "Contact", "Summary", "Experience", "Education", "Skills")
2. For each section, identify individual items (e.g., job entries, bullet points)
3. Map each original item to its optimized equivalent
4. Preserve the ORDER and STRUCTURE - don't reorganize
5. If optimized text added new content, note it as "addition"
6. If optimized text removed content, note it as "removal"

Return ONLY valid JSON in this format:
{
  "sections": [
    {
      "name": "section name",
      "replacements": [
        {
          "original": "original text to find",
          "optimized": "new text to replace with",
          "type": "replace|add|remove"
        }
      ]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing document structure and creating precise content mappings. Always return valid JSON.'
        },
        {
          role: 'user',
          content: mappingPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });

    const mappingText = completion.choices[0].message.content;

    // Extract JSON from response (in case AI adds explanation)
    const jsonMatch = mappingText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to generate mapping');
    }

    const mapping = JSON.parse(jsonMatch[0]);

    // Return the mapping so frontend can apply it
    res.status(200).json({
      mapping,
      instructions: "Use this mapping to replace content in the original document while preserving formatting."
    });

  } catch (error) {
    console.error('Error creating format preservation mapping:', error);
    res.status(500).json({
      error: 'Failed to create format preservation mapping',
      details: error.message
    });
  }
}
