import OpenAI from 'openai';

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
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const prompt = `You are enhancing a resume while preserving its EXACT formatting and structure.

RULES:
1. Return the resume with the EXACT SAME layout, sections, spacing, and structure
2. Keep every single line, bullet point, and section in the same position
3. Only make these MINIMAL improvements to the TEXT ONLY:
   - Replace weak verbs with stronger action verbs (e.g., "Worked on" → "Led", "Did" → "Implemented")
   - Add specific metrics/numbers where they're implied but missing (e.g., "many projects" → "15+ projects", "team" → "team of 8")
   - Make wording more impactful without changing meaning
4. DO NOT reorganize, restructure, or reformat anything
5. DO NOT add new sections or remove existing ones
6. DO NOT change headers or section titles
7. Keep the output IDENTICAL in structure to the input

Original Resume:
${text}

Enhanced Resume (SAME STRUCTURE, BETTER WORDING):`;

    const completion = await openai.chat.completions.create({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a professional resume editor. You make minimal, surgical improvements to text while preserving exact structure and formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more conservative output
      max_tokens: 2500
    });

    const enhancedText = completion.choices[0].message.content;

    res.status(200).json({ rewrittenText: enhancedText });
  } catch (error) {
    console.error('Error enhancing resume:', error);
    res.status(500).json({
      error: 'Failed to enhance resume',
      details: error.message
    });
  }
}
