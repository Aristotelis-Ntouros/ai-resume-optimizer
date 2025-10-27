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
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'Resume text and job description are required' });
    }

    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer and career coach.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Analyze how well this resume matches the job description. Return ONLY valid JSON with this structure:

{
  "matchScore": 75,
  "analysis": {
    "strengths": [
      "Strong experience with React and Node.js matching job requirements",
      "Leadership experience aligns with team lead expectations"
    ],
    "gaps": [
      "Missing AWS/cloud infrastructure experience mentioned in job",
      "No mention of CI/CD pipelines required for the role"
    ],
    "recommendations": [
      "Add AWS certification or cloud projects to resume",
      "Highlight any deployment or DevOps experience"
    ]
  },
  "keywords": {
    "matched": [
      {"keyword": "React", "importance": "high", "found": true},
      {"keyword": "JavaScript", "importance": "high", "found": true},
      {"keyword": "Team Leadership", "importance": "medium", "found": true}
    ],
    "missing": [
      {"keyword": "AWS", "importance": "high", "category": "Technical Skills"},
      {"keyword": "Docker", "importance": "medium", "category": "DevOps"},
      {"keyword": "CI/CD", "importance": "medium", "category": "DevOps"},
      {"keyword": "Kubernetes", "importance": "low", "category": "Infrastructure"}
    ]
  },
  "skillsBreakdown": {
    "technical": {
      "score": 70,
      "matched": ["React", "Node.js", "JavaScript", "TypeScript"],
      "missing": ["AWS", "Docker", "Kubernetes"]
    },
    "soft": {
      "score": 85,
      "matched": ["Leadership", "Communication", "Problem Solving"],
      "missing": ["Agile/Scrum", "Mentoring"]
    },
    "experience": {
      "score": 80,
      "yearsRequired": "5+",
      "yearsInResume": "6",
      "relevantExperience": true
    }
  },
  "atsCompatibility": {
    "score": 82,
    "keywordDensity": "good",
    "formatIssues": []
  },
  "summary": "Good match with 75% compatibility. Strong technical foundation but missing cloud infrastructure experience. Add AWS and DevOps keywords to increase match to 90%+."
}

CRITICAL:
- matchScore should be 0-100 based on how well resume matches job
- missing keywords should be ranked by importance (high/medium/low)
- Be specific and actionable in recommendations
- Consider both hard skills and soft skills
- Return ONLY the JSON, no markdown or extra text`;

    const completion = await openai.chat.completions.create({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are an expert ATS analyzer. Always respond with valid JSON only, no markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2500
    });

    const responseText = completion.choices[0].message.content.trim();

    // Extract JSON from response (in case AI adds markdown)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : responseText;

    const matchData = JSON.parse(jsonText);

    res.status(200).json(matchData);
  } catch (error) {
    console.error('Error analyzing job match:', error);
    res.status(500).json({
      error: 'Failed to analyze job match',
      details: error.message
    });
  }
}
