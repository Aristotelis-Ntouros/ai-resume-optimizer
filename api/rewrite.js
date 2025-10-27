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
    const { text, type, atsIssues } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    let prompt;
    if (type === 'cv') {
      // Build ATS-specific instructions based on issues
      const atsInstructions = atsIssues && atsIssues.length > 0
        ? `\n\nCRITICAL ATS ISSUES TO FIX:\n${atsIssues.map(issue =>
            `- ${issue.issue}: ${issue.description}`
          ).join('\n')}\n\nYou MUST address all these issues in the rewrite.`
        : '';

      prompt = `You are a professional resume writer specializing in ATS (Applicant Tracking System) optimization.

CRITICAL REQUIREMENTS:
1. Use STRONG ACTION VERBS (achieved, developed, led, managed, created, implemented, increased, reduced, optimized)
2. QUANTIFY EVERYTHING - Add numbers, percentages, dollar amounts, team sizes (e.g., "Increased sales by 35%", "Managed team of 10", "Reduced costs by $50K")
3. Include KEYWORDS relevant to the role (technologies, skills, tools, methodologies)
4. Use SIMPLE FORMATTING - No tables, no columns, no special characters
5. Include standard sections: Contact, Summary, Experience, Education, Skills
6. Keep it ATS-FRIENDLY - single column, standard bullet points (•), clear headers
7. Aim for 400-800 words total
8. Add concrete achievements with metrics for each role${atsInstructions}

CV to rewrite:
${text}

Rewritten ATS-Optimized CV:`;
    } else {
      prompt = text;
    }


    const completion = await openai.chat.completions.create({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a professional resume writer with expertise in creating ATS-friendly, impactful resumes.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const rewrittenText = completion.choices[0].message.content;

    res.status(200).json({ rewrittenText });
  } catch (error) {
    console.error('Error rewriting CV:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error cause:', error.cause);
    console.error('API Key exists:', !!process.env.PERPLEXITY_API_KEY);
    console.error('API Key prefix:', process.env.PERPLEXITY_API_KEY?.substring(0, 20));
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({
      error: 'Failed to rewrite CV',
      details: error.message,
      errorName: error.name,
      errorCode: error.code,
      hasApiKey: !!process.env.PERPLEXITY_API_KEY,
      keyPrefix: process.env.PERPLEXITY_API_KEY?.substring(0, 15)
    });
  }
}
