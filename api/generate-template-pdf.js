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
    const { cvData, templateName } = req.body;

    if (!cvData || !templateName) {
      return res.status(400).json({ error: 'CV data and template name are required' });
    }

    const html = generateTemplateHTML(cvData, templateName);

    // For Vercel serverless, we'll use a simpler approach initially
    // Return HTML for client-side PDF generation
    res.status(200).json({
      html,
      message: 'Template generated successfully'
    });

  } catch (error) {
    console.error('Error generating template PDF:', error);
    res.status(500).json({
      error: 'Failed to generate template PDF',
      details: error.message
    });
  }
}

function generateTemplateHTML(cvData, templateName) {
  const templates = {
    modern: getModernTemplate(cvData),
    executive: getExecutiveTemplate(cvData),
    minimal: getMinimalTemplate(cvData),
    creative: getCreativeTemplate(cvData),
    academic: getAcademicTemplate(cvData)
  };

  return templates[templateName] || templates.modern;
}

function getModernTemplate(cv) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: #2d3748;
      font-size: 11pt;
      background: white;
    }
    .container {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
    }
    .header {
      border-bottom: 3px solid #6366f1;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .name {
      font-size: 28pt;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 8px;
    }
    .title {
      font-size: 14pt;
      color: #6366f1;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .contact {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      font-size: 10pt;
      color: #4a5568;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 13pt;
      font-weight: 700;
      color: #1a202c;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
    }
    .summary {
      font-size: 10.5pt;
      line-height: 1.7;
      color: #4a5568;
    }
    .experience-item, .education-item {
      margin-bottom: 18px;
    }
    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 6px;
    }
    .job-title {
      font-size: 12pt;
      font-weight: 700;
      color: #1a202c;
    }
    .job-company {
      font-size: 11pt;
      color: #6366f1;
      font-weight: 600;
    }
    .job-date {
      font-size: 9.5pt;
      color: #718096;
      font-style: italic;
    }
    .job-location {
      font-size: 9.5pt;
      color: #718096;
      margin-bottom: 8px;
    }
    .achievements {
      list-style: none;
      padding-left: 0;
    }
    .achievements li {
      padding-left: 18px;
      position: relative;
      margin-bottom: 6px;
      font-size: 10.5pt;
      line-height: 1.6;
    }
    .achievements li:before {
      content: "•";
      color: #6366f1;
      font-weight: bold;
      position: absolute;
      left: 0;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .skill-category {
      margin-bottom: 10px;
    }
    .skill-category-title {
      font-weight: 700;
      color: #1a202c;
      font-size: 10.5pt;
      margin-bottom: 5px;
    }
    .skill-list {
      color: #4a5568;
      font-size: 10pt;
      line-height: 1.5;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .container { padding: 0.3in; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="name">${cv.name || 'Your Name'}</div>
      <div class="title">${cv.title || 'Professional Title'}</div>
      <div class="contact">
        ${cv.contact?.email ? `<div class="contact-item">${cv.contact.email}</div>` : ''}
        ${cv.contact?.phone ? `<div class="contact-item">${cv.contact.phone}</div>` : ''}
        ${cv.contact?.location ? `<div class="contact-item">${cv.contact.location}</div>` : ''}
        ${cv.contact?.linkedin ? `<div class="contact-item">${cv.contact.linkedin}</div>` : ''}
        ${cv.contact?.github ? `<div class="contact-item">${cv.contact.github}</div>` : ''}
      </div>
    </div>

    ${cv.summary ? `
    <div class="section">
      <div class="section-title">Professional Summary</div>
      <div class="summary">${cv.summary}</div>
    </div>
    ` : ''}

    ${cv.experience && cv.experience.length > 0 ? `
    <div class="section">
      <div class="section-title">Professional Experience</div>
      ${cv.experience.map(exp => `
        <div class="experience-item">
          <div class="job-header">
            <div>
              <div class="job-title">${exp.title || 'Job Title'}</div>
              <div class="job-company">${exp.company || 'Company Name'}</div>
            </div>
            <div class="job-date">${exp.startDate || ''} - ${exp.endDate || 'Present'}</div>
          </div>
          ${exp.location ? `<div class="job-location">${exp.location}</div>` : ''}
          ${exp.achievements && exp.achievements.length > 0 ? `
            <ul class="achievements">
              ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${cv.education && cv.education.length > 0 ? `
    <div class="section">
      <div class="section-title">Education</div>
      ${cv.education.map(edu => `
        <div class="education-item">
          <div class="job-header">
            <div>
              <div class="job-title">${edu.degree || 'Degree'}</div>
              <div class="job-company">${edu.institution || 'Institution'}</div>
            </div>
            <div class="job-date">${edu.graduationDate || ''}</div>
          </div>
          ${edu.gpa || edu.honors ? `
            <div class="job-location">
              ${edu.gpa ? `GPA: ${edu.gpa}` : ''}
              ${edu.honors ? `• ${edu.honors}` : ''}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${cv.skills ? `
    <div class="section">
      <div class="section-title">Skills</div>
      <div class="skills-grid">
        ${cv.skills.technical && cv.skills.technical.length > 0 ? `
          <div class="skill-category">
            <div class="skill-category-title">Technical Skills</div>
            <div class="skill-list">${cv.skills.technical.join(' • ')}</div>
          </div>
        ` : ''}
        ${cv.skills.languages && cv.skills.languages.length > 0 ? `
          <div class="skill-category">
            <div class="skill-category-title">Languages</div>
            <div class="skill-list">${cv.skills.languages.join(' • ')}</div>
          </div>
        ` : ''}
        ${cv.skills.soft && cv.skills.soft.length > 0 ? `
          <div class="skill-category">
            <div class="skill-category-title">Soft Skills</div>
            <div class="skill-list">${cv.skills.soft.join(' • ')}</div>
          </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    ${cv.certifications && cv.certifications.length > 0 ? `
    <div class="section">
      <div class="section-title">Certifications</div>
      ${cv.certifications.map(cert => `
        <div class="experience-item">
          <div class="job-title">${cert.name}</div>
          <div class="job-location">${cert.issuer || ''} ${cert.date ? `• ${cert.date}` : ''}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
</body>
</html>
  `;
}

function getExecutiveTemplate(cv) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      line-height: 1.6;
      color: #1a202c;
      font-size: 11pt;
      background: white;
    }
    .container {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
    }
    .header {
      text-align: center;
      border-bottom: 4px double #2d3748;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .name {
      font-size: 32pt;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 10px;
      letter-spacing: 2px;
    }
    .title {
      font-size: 13pt;
      color: #4a5568;
      font-weight: 600;
      margin-bottom: 15px;
      font-style: italic;
    }
    .contact {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 20px;
      font-size: 10pt;
      color: #4a5568;
    }
    .section {
      margin-bottom: 28px;
    }
    .section-title {
      font-size: 14pt;
      font-weight: 700;
      color: #1a202c;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 3px solid #2d3748;
    }
    .summary {
      font-size: 11pt;
      line-height: 1.8;
      color: #2d3748;
      font-style: italic;
    }
    .experience-item {
      margin-bottom: 20px;
    }
    .job-title {
      font-size: 12pt;
      font-weight: 700;
      color: #1a202c;
    }
    .job-company {
      font-size: 11pt;
      color: #2d3748;
      font-weight: 600;
      font-style: italic;
    }
    .job-meta {
      font-size: 10pt;
      color: #718096;
      margin-bottom: 10px;
    }
    .achievements {
      list-style: none;
      padding-left: 0;
    }
    .achievements li {
      padding-left: 20px;
      position: relative;
      margin-bottom: 8px;
      font-size: 10.5pt;
      line-height: 1.7;
    }
    .achievements li:before {
      content: "▪";
      position: absolute;
      left: 0;
      font-weight: bold;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="name">${cv.name || 'YOUR NAME'}</div>
      <div class="title">${cv.title || 'Professional Title'}</div>
      <div class="contact">
        ${cv.contact?.email ? `<span>${cv.contact.email}</span>` : ''}
        ${cv.contact?.phone ? `<span>${cv.contact.phone}</span>` : ''}
        ${cv.contact?.location ? `<span>${cv.contact.location}</span>` : ''}
        ${cv.contact?.linkedin ? `<span>${cv.contact.linkedin}</span>` : ''}
      </div>
    </div>

    ${cv.summary ? `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">${cv.summary}</div>
    </div>
    ` : ''}

    ${cv.experience && cv.experience.length > 0 ? `
    <div class="section">
      <div class="section-title">Professional Experience</div>
      ${cv.experience.map(exp => `
        <div class="experience-item">
          <div class="job-title">${exp.title || 'Position Title'}</div>
          <div class="job-company">${exp.company || 'Company Name'}</div>
          <div class="job-meta">
            ${exp.location || ''} | ${exp.startDate || ''} - ${exp.endDate || 'Present'}
          </div>
          ${exp.achievements && exp.achievements.length > 0 ? `
            <ul class="achievements">
              ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${cv.education && cv.education.length > 0 ? `
    <div class="section">
      <div class="section-title">Education</div>
      ${cv.education.map(edu => `
        <div class="experience-item">
          <div class="job-title">${edu.degree || 'Degree'}</div>
          <div class="job-company">${edu.institution || 'Institution'}</div>
          <div class="job-meta">
            ${edu.location || ''} ${edu.graduationDate ? `| ${edu.graduationDate}` : ''}
            ${edu.gpa ? `| GPA: ${edu.gpa}` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${cv.skills ? `
    <div class="section">
      <div class="section-title">Core Competencies</div>
      <div class="summary">
        ${[
          ...(cv.skills.technical || []),
          ...(cv.skills.soft || []),
          ...(cv.skills.languages || [])
        ].join(' • ')}
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>
  `;
}

function getMinimalTemplate(cv) {
  return getModernTemplate(cv).replace(/#6366f1/g, '#2d3748').replace(/3px solid/g, '1px solid');
}

function getCreativeTemplate(cv) {
  return getModernTemplate(cv).replace(/#6366f1/g, '#ec4899');
}

function getAcademicTemplate(cv) {
  return getExecutiveTemplate(cv);
}
