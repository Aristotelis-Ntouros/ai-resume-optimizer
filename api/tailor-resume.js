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
    const { resumeText, jobDescription, matchAnalysis } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'Resume text and job description are required' });
    }

    // Build context from match analysis if provided
    const missingKeywordsContext = matchAnalysis?.keywords?.missing
      ? `\n\nCRITICAL MISSING KEYWORDS TO INCORPORATE:\n${matchAnalysis.keywords.missing
          .filter(k => k.importance === 'high' || k.importance === 'medium')
          .map(k => `- ${k.keyword} (${k.importance} importance, ${k.category})`)
          .join('\n')}`
      : '';

    const gapsContext = matchAnalysis?.analysis?.gaps
      ? `\n\nKEY GAPS TO ADDRESS:\n${matchAnalysis.analysis.gaps.map(g => `- ${g}`).join('\n')}`
      : '';

    const prompt = `You are an expert resume writer and career coach specializing in ATS optimization and job-specific tailoring.

ORIGINAL RESUME:
${resumeText}

TARGET JOB DESCRIPTION:
${jobDescription}
${missingKeywordsContext}
${gapsContext}

YOUR TASK:
Rewrite this resume to be perfectly tailored for this specific job while maintaining truthfulness and the candidate's actual experience.

CRITICAL REQUIREMENTS:
1. **INCORPORATE MISSING KEYWORDS NATURALLY** - Weave in the missing high/medium importance keywords where relevant
2. **QUANTIFY EVERYTHING** - Add/enhance metrics, percentages, dollar amounts (e.g., "Increased efficiency by 35%", "Managed $2M budget")
3. **USE STRONG ACTION VERBS** - Led, Developed, Architected, Optimized, Implemented, Delivered, Achieved
4. **MATCH JOB REQUIREMENTS** - Reorganize/reframe experience to highlight relevant skills for THIS job
5. **ATS-FRIENDLY FORMAT** - Simple formatting, standard sections, no tables/columns
6. **HIGHLIGHT RELEVANT ACHIEVEMENTS** - Prioritize experience most relevant to job description
7. **ADD STRATEGIC KEYWORDS** - Include job-specific technologies, methodologies, tools mentioned in job posting
8. **MAINTAIN TRUTH** - Never fabricate experience, only reframe and optimize existing content
9. **OPTIMIZE LENGTH** - Keep it concise (400-800 words for 1-2 pages)
10. **PROFESSIONAL TONE** - Confident but not arrogant, achievement-focused

STRUCTURE TO FOLLOW:
1. Contact Information (if present)
2. Professional Summary (2-3 sentences highlighting fit for THIS role)
3. Professional Experience (most relevant experience first, with quantified achievements)
4. Education
5. Skills (organized by relevance to job: Technical Skills, Tools, Soft Skills)
6. Certifications (if applicable)

IMPORTANT NOTES:
- If the resume lacks specific keywords from the job, add them to relevant sections (skills, experience descriptions)
- Reframe job responsibilities as achievements with metrics
- Front-load the most relevant experience
- Use industry-specific terminology from the job posting
- Ensure every bullet point adds value and demonstrates impact

Return the tailored, ATS-optimized resume:`;

    const completion = await openai.chat.completions.create({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume writer who creates ATS-friendly, job-specific resumes that get interviews. You optimize resumes while maintaining truthfulness about the candidate\'s experience.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500
    });

    const tailoredResume = completion.choices[0].message.content.trim();

    res.status(200).json({
      tailoredResume,
      improvements: {
        keywordsAdded: matchAnalysis?.keywords?.missing?.length || 0,
        matchScoreBefore: matchAnalysis?.matchScore || null
      }
    });
  } catch (error) {
    console.error('Error tailoring resume:', error);
    res.status(500).json({
      error: 'Failed to tailor resume',
      details: error.message
    });
  }
}
