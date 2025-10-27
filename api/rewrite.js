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
    const { text, type, atsIssues, preserveFormatting } = req.body;

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

      // Build formatting instructions based on user preference
      const formattingInstructions = preserveFormatting
        ? `\n\n**CRITICAL: PRESERVE ORIGINAL FORMATTING & CONTENT**\nThe user wants to keep their existing template. You MUST:
- Include EVERY SINGLE section from the original (Name, Contact, Summary, Skills, Languages, Interests, Work Experience, Education, etc.)
- Keep ALL content - do NOT delete or remove anything
- Preserve the EXACT structure and order of sections
- Only ENHANCE the content: strengthen action verbs, quantify achievements where possible, add relevant keywords
- If a section has content in the original, it MUST have content in the rewritten version
- Keep the same formatting style (bullet points, headers, spacing)
- Return the COMPLETE resume with all information preserved and enhanced`
        : `6. Use SIMPLE FORMATTING - No tables, no columns, no special characters
7. Include standard sections: Contact, Summary, Experience, Education, Skills
8. Keep it ATS-FRIENDLY - single column, standard bullet points (•), clear headers
9. Aim for 400-800 words total`;

      prompt = `You are a professional resume writer specializing in ATS (Applicant Tracking System) optimization.

CRITICAL REQUIREMENTS:
1. **PRESERVE JOB ACCURACY** - Keep each job's responsibilities, dates, and achievements EXACTLY as they relate to that specific role. NEVER move descriptions between different jobs.
2. **MAINTAIN CHRONOLOGICAL INTEGRITY** - Ensure older job descriptions stay with older jobs, and newer job descriptions stay with newer jobs. Do NOT mix them up.
3. Use STRONG ACTION VERBS (achieved, developed, led, managed, created, implemented, increased, reduced, optimized)
4. QUANTIFY achievements - Add numbers, percentages, dollar amounts, team sizes where appropriate for EACH specific role
5. Include KEYWORDS relevant to each specific role (technologies, skills, tools, methodologies used in THAT job)
${formattingInstructions}
10. **DOUBLE CHECK** - Before finalizing, verify that each job description matches its job title and time period${atsInstructions}

CV to rewrite:
${text}

Rewritten ATS-Optimized CV (MAINTAIN EXACT JOB-TO-DESCRIPTION MAPPING):`;
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
