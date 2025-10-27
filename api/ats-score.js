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

    const analysis = analyzeATS(text);
    res.status(200).json(analysis);
  } catch (error) {
    console.error('Error analyzing ATS:', error);
    res.status(500).json({
      error: 'Failed to analyze ATS score',
      details: error.message
    });
  }
}

function analyzeATS(cvText) {
  const issues = [];
  const recommendations = [];
  let totalScore = 100;

  // Score breakdown by category
  const scores = {
    format: 100,
    keywords: 100,
    structure: 100,
    content: 100,
    contact: 100
  };

  // 1. FORMAT CHECKS (25 points)
  // Check for tables (ATS killer)
  if (cvText.includes('│') || cvText.includes('┼') || cvText.includes('─') ||
      cvText.match(/\|[\s\S]*\|/) || cvText.includes('|---')) {
    issues.push({
      category: 'Format',
      severity: 'high',
      issue: 'Tables detected',
      description: 'ATS systems cannot parse tables. Use simple bullet points instead.',
      impact: -15
    });
    scores.format -= 60;
  }

  // Check for columns/multiple column layout indicators
  if (cvText.match(/\s{10,}/g)?.length > 5) {
    issues.push({
      category: 'Format',
      severity: 'medium',
      issue: 'Possible multi-column layout',
      description: 'Large gaps suggest columns. Use single-column format for better ATS compatibility.',
      impact: -10
    });
    scores.format -= 40;
  }

  // Check for special characters that ATS can't read
  const specialChars = cvText.match(/[★☆●◆■□▪▫♦✓✔]/g);
  if (specialChars && specialChars.length > 5) {
    issues.push({
      category: 'Format',
      severity: 'medium',
      issue: `${specialChars.length} special characters found`,
      description: 'Replace special characters with standard bullet points (-, •).',
      impact: -8
    });
    scores.format -= 30;
  }

  // 2. STRUCTURE CHECKS (20 points)
  const sections = {
    contact: /contact|email|phone|linkedin|github/i.test(cvText),
    experience: /experience|work history|employment/i.test(cvText),
    education: /education|degree|university|college/i.test(cvText),
    skills: /skills|technologies|competencies/i.test(cvText)
  };

  const missingSections = Object.entries(sections)
    .filter(([_, exists]) => !exists)
    .map(([section]) => section);

  if (missingSections.length > 0) {
    issues.push({
      category: 'Structure',
      severity: 'high',
      issue: `Missing key sections: ${missingSections.join(', ')}`,
      description: 'ATS expects standard resume sections. Add missing sections.',
      impact: -5 * missingSections.length
    });
    scores.structure -= 25 * missingSections.length;
  }

  // 3. CONTACT INFO CHECKS (15 points)
  const hasEmail = /@[\w.-]+\.\w+/.test(cvText);
  const hasPhone = /\+?\d[\d\s()-]{8,}/.test(cvText);
  const hasLinkedIn = /linkedin\.com/i.test(cvText);

  if (!hasEmail) {
    issues.push({
      category: 'Contact',
      severity: 'high',
      issue: 'Email address missing',
      description: 'Add a professional email address.',
      impact: -10
    });
    scores.contact -= 40;
  }

  if (!hasPhone) {
    issues.push({
      category: 'Contact',
      severity: 'medium',
      issue: 'Phone number missing',
      description: 'Include a phone number for contact.',
      impact: -5
    });
    scores.contact -= 30;
  }

  if (!hasLinkedIn) {
    recommendations.push({
      category: 'Contact',
      priority: 'medium',
      recommendation: 'Add LinkedIn profile URL',
      benefit: '+5 points'
    });
    scores.contact -= 30;
  }

  // 4. KEYWORD & CONTENT ANALYSIS (25 points)
  const actionVerbs = [
    'achieved', 'developed', 'improved', 'led', 'managed', 'created',
    'implemented', 'designed', 'built', 'launched', 'increased', 'reduced',
    'optimized', 'delivered', 'coordinated', 'analyzed', 'established'
  ];

  const actionVerbCount = actionVerbs.filter(verb =>
    new RegExp(`\\b${verb}\\b`, 'i').test(cvText)
  ).length;

  if (actionVerbCount < 5) {
    issues.push({
      category: 'Content',
      severity: 'medium',
      issue: `Only ${actionVerbCount} action verbs found`,
      description: 'Use more action verbs (achieved, developed, led, etc.) to describe accomplishments.',
      impact: -8
    });
    scores.content -= 40;
  }

  // Check for quantifiable achievements
  const numbers = cvText.match(/\d+%|\d+x|\$\d+|(\d+,)?\d+\s*(users|customers|projects|team|revenue)/gi);
  const quantifiableCount = numbers ? numbers.length : 0;

  if (quantifiableCount < 3) {
    issues.push({
      category: 'Content',
      severity: 'high',
      issue: `Only ${quantifiableCount} quantifiable achievements`,
      description: 'Add numbers and metrics (e.g., "Increased sales by 35%", "Managed team of 10").',
      impact: -12
    });
    scores.content -= 50;
  }

  // 5. KEYWORD DENSITY (15 points)
  const commonTechKeywords = [
    'javascript', 'python', 'java', 'react', 'node', 'aws', 'docker',
    'kubernetes', 'agile', 'ci/cd', 'api', 'database', 'sql', 'git',
    'project management', 'leadership', 'communication', 'problem solving'
  ];

  const foundKeywords = commonTechKeywords.filter(keyword =>
    new RegExp(`\\b${keyword}\\b`, 'i').test(cvText)
  );

  const keywordDensity = (foundKeywords.length / commonTechKeywords.length) * 100;

  if (keywordDensity < 20) {
    issues.push({
      category: 'Keywords',
      severity: 'high',
      issue: 'Low keyword density',
      description: 'Include more relevant industry keywords and technologies.',
      impact: -10
    });
    scores.keywords -= 50;
  }

  // Check CV length
  const wordCount = cvText.split(/\s+/).length;
  if (wordCount < 200) {
    issues.push({
      category: 'Content',
      severity: 'high',
      issue: 'CV too short',
      description: `Only ${wordCount} words. Aim for 400-800 words.`,
      impact: -15
    });
    scores.content -= 60;
  } else if (wordCount > 1200) {
    issues.push({
      category: 'Content',
      severity: 'medium',
      issue: 'CV too long',
      description: `${wordCount} words. Keep it under 800 words for better ATS performance.`,
      impact: -8
    });
    scores.content -= 30;
  }

  // RECOMMENDATIONS
  if (actionVerbCount >= 5 && quantifiableCount >= 3) {
    recommendations.push({
      category: 'Content',
      priority: 'low',
      recommendation: 'Strong use of action verbs and metrics - keep it up!',
      benefit: 'Current format is ATS-friendly'
    });
  }

  if (scores.format === 100) {
    recommendations.push({
      category: 'Format',
      priority: 'low',
      recommendation: 'Excellent formatting - no ATS blockers detected',
      benefit: 'Maximum ATS readability'
    });
  }

  if (!cvText.toLowerCase().includes('summary') && !cvText.toLowerCase().includes('objective')) {
    recommendations.push({
      category: 'Structure',
      priority: 'medium',
      recommendation: 'Add a professional summary at the top',
      benefit: '+3 points - Helps ATS understand your profile quickly'
    });
  }

  // Calculate total score
  const categoryScores = Object.values(scores);
  const avgScore = Math.round(categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length);
  const finalScore = Math.max(0, Math.min(100, avgScore));

  // Generate keyword suggestions based on missing keywords
  const missingKeywords = commonTechKeywords.filter(kw => !foundKeywords.includes(kw));
  const keywordSuggestions = missingKeywords.slice(0, 10);

  return {
    score: finalScore,
    grade: getGrade(finalScore),
    scores,
    issues: issues.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    recommendations,
    stats: {
      wordCount,
      actionVerbCount,
      quantifiableAchievements: quantifiableCount,
      keywordDensity: Math.round(keywordDensity),
      foundKeywords: foundKeywords.length,
      totalKeywordsScanned: commonTechKeywords.length
    },
    keywordSuggestions,
    summary: generateSummary(finalScore, issues.length)
  };
}

function getGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function generateSummary(score, issueCount) {
  if (score >= 90) {
    return 'Excellent! Your CV is highly optimized for ATS systems.';
  } else if (score >= 75) {
    return `Good job! Fix ${issueCount} issue${issueCount !== 1 ? 's' : ''} to reach excellent status.`;
  } else if (score >= 60) {
    return `Decent, but needs work. Address ${issueCount} issue${issueCount !== 1 ? 's' : ''} to improve ATS compatibility.`;
  } else if (score >= 40) {
    return `Below average. Your CV may be rejected by ATS. Fix ${issueCount} critical issues immediately.`;
  } else {
    return 'Critical! Your CV will likely be rejected by most ATS systems. Major improvements needed.';
  }
}
