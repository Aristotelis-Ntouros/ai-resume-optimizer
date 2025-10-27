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

    const prompt = `Based on the following CV, generate a compelling LinkedIn headline (max 120 characters) and a professional LinkedIn summary (max 2000 characters).

The headline should be attention-grabbing and showcase the person's key value proposition.
The summary should tell their professional story, highlight key achievements, and end with a call to action.

CV:
${text}

You must respond with ONLY a JSON object in this exact format, with no additional text:
{"headline": "Your headline here", "summary": "Your summary here"}`;

    const completion = await openai.chat.completions.create({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a LinkedIn profile optimization expert who creates compelling headlines and summaries. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1500
    });

    const responseText = completion.choices[0].message.content.trim();

    // Extract JSON from response (in case there's extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : responseText;

    const result = JSON.parse(jsonText);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error generating LinkedIn content:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error cause:', error.cause);
    console.error('API Key exists:', !!process.env.PERPLEXITY_API_KEY);
    console.error('API Key prefix:', process.env.PERPLEXITY_API_KEY?.substring(0, 20));
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({
      error: 'Failed to generate LinkedIn content',
      details: error.message,
      errorName: error.name,
      errorCode: error.code,
      hasApiKey: !!process.env.PERPLEXITY_API_KEY,
      keyPrefix: process.env.PERPLEXITY_API_KEY?.substring(0, 15)
    });
  }
}
