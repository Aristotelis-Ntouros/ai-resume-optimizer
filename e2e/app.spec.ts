import { test, expect } from '@playwright/test';
import * as path from 'path';

// Test credentials
const TEST_EMAIL = 'ar.ntouros@gmail.com';
const TEST_PASSWORD = 'Weird3485';

// Sample resume text for testing
const SAMPLE_RESUME = `John Doe
Software Engineer

EXPERIENCE
Senior Developer at TechCorp (2020-Present)
- Developed web applications
- Led team of 5 developers
- Improved performance by 40%

Junior Developer at StartupXYZ (2018-2020)
- Built frontend features
- Collaborated with design team

EDUCATION
BS Computer Science, University (2018)

SKILLS
JavaScript, TypeScript, React, Node.js, Python`;

test.describe('Resume Optimizer E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('01 - User can login with credentials', async ({ page }) => {
    await test.step('Navigate to login', async () => {
      // Check if we're on login page or need to navigate
      const loginButton = page.locator('a[href="/login"]');
      if (await loginButton.isVisible()) {
        await loginButton.click();
      }
    });

    await test.step('Fill in credentials', async () => {
      await page.fill('input[type="email"]', TEST_EMAIL);
      await page.fill('input[type="password"]', TEST_PASSWORD);
    });

    await test.step('Submit login form', async () => {
      await page.click('button[type="submit"]');
    });

    await test.step('Verify successful login', async () => {
      // Wait for navigation to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await expect(page).toHaveURL(/.*dashboard/);

      // Verify user email is displayed
      await expect(page.locator('text=' + TEST_EMAIL)).toBeVisible({ timeout: 5000 });
    });
  });

  test('02 - Upload resume and get ATS score', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await test.step('Create temporary resume file', async () => {
      // We'll use the file upload with a temporary text file
      const tempFilePath = path.join(process.cwd(), 'temp-resume.txt');
      const fs = require('fs');
      fs.writeFileSync(tempFilePath, SAMPLE_RESUME);
    });

    await test.step('Upload resume file', async () => {
      const fileInput = page.locator('input[type="file"]');
      const tempFilePath = path.join(process.cwd(), 'temp-resume.txt');
      await fileInput.setInputFiles(tempFilePath);
    });

    await test.step('Wait for ATS analysis', async () => {
      // Wait for ATS score to appear
      await expect(page.locator('text=/ATS Score|Score/')).toBeVisible({ timeout: 30000 });

      // Verify score is displayed
      const scoreElement = page.locator('[class*="score"]').first();
      await expect(scoreElement).toBeVisible();
    });

    await test.step('Verify file info is displayed', async () => {
      await expect(page.locator('text=/temp-resume/')).toBeVisible();
    });
  });

  test('03 - Optimize resume with AI', async ({ page }) => {
    // Login and upload
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Upload resume
    const fileInput = page.locator('input[type="file"]');
    const tempFilePath = path.join(process.cwd(), 'temp-resume.txt');
    const fs = require('fs');
    fs.writeFileSync(tempFilePath, SAMPLE_RESUME);
    await fileInput.setInputFiles(tempFilePath);

    // Wait for upload to process
    await page.waitForTimeout(3000);

    await test.step('Click optimize button', async () => {
      const optimizeButton = page.locator('button:has-text("Optimize")');
      await optimizeButton.click();
    });

    await test.step('Wait for AI optimization', async () => {
      // Wait for loading state
      await expect(page.locator('text=/Optimizing/')).toBeVisible({ timeout: 5000 });

      // Wait for completion (up to 60 seconds for AI)
      await expect(page.locator('text=/Optimized|Your Optimized/')).toBeVisible({ timeout: 60000 });
    });

    await test.step('Verify optimized resume is displayed', async () => {
      // Should show comparison view
      await expect(page.locator('text=/Original|Optimized/')).toBeVisible();

      // Verify download button is available
      await expect(page.locator('button:has-text("Download")')).toBeVisible();
    });

    await test.step('Verify AI made improvements', async () => {
      // Check that optimized text is different from original
      const originalText = await page.locator('[class*="text-content"]').first().textContent();
      const optimizedText = await page.locator('[class*="text-content"]').last().textContent();

      expect(originalText).not.toBe(optimizedText);
      expect(optimizedText?.length).toBeGreaterThan(0);
    });
  });

  test('04 - Job matching feature', async ({ page }) => {
    // Login and upload
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Upload resume
    const fileInput = page.locator('input[type="file"]');
    const tempFilePath = path.join(process.cwd(), 'temp-resume.txt');
    const fs = require('fs');
    fs.writeFileSync(tempFilePath, SAMPLE_RESUME);
    await fileInput.setInputFiles(tempFilePath);
    await page.waitForTimeout(3000);

    await test.step('Open job matcher', async () => {
      const matcherButton = page.locator('button:has-text("Job")');
      await matcherButton.click();
    });

    await test.step('Enter job description', async () => {
      const jobDescTextarea = page.locator('textarea[placeholder*="job" i], textarea[placeholder*="description" i]');
      await jobDescTextarea.fill(`Senior Full Stack Developer

Requirements:
- 5+ years of JavaScript/TypeScript experience
- React and Node.js expertise
- Team leadership experience
- Strong problem-solving skills`);
    });

    await test.step('Analyze match', async () => {
      const analyzeButton = page.locator('button:has-text("Analyze")');
      await analyzeButton.click();

      // Wait for analysis
      await expect(page.locator('text=/Match|Score/')).toBeVisible({ timeout: 30000 });
    });

    await test.step('Verify match results', async () => {
      // Should show match score
      await expect(page.locator('[class*="match-score"], [class*="score"]')).toBeVisible();

      // Should show analysis sections
      await expect(page.locator('text=/strengths|gaps|keywords/i')).toBeVisible();
    });
  });

  test('05 - PDF generation', async ({ page }) => {
    // Login, upload, and optimize
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Upload and optimize
    const fileInput = page.locator('input[type="file"]');
    const tempFilePath = path.join(process.cwd(), 'temp-resume.txt');
    const fs = require('fs');
    fs.writeFileSync(tempFilePath, SAMPLE_RESUME);
    await fileInput.setInputFiles(tempFilePath);
    await page.waitForTimeout(3000);

    const optimizeButton = page.locator('button:has-text("Optimize")');
    await optimizeButton.click();
    await page.waitForSelector('text=/Your Optimized/', { timeout: 60000 });

    await test.step('Click download PDF', async () => {
      const downloadButton = page.locator('button:has-text("Download")');
      await downloadButton.click();
    });

    await test.step('Select template', async () => {
      // Wait for template selector modal
      await expect(page.locator('text=/template/i')).toBeVisible({ timeout: 5000 });

      // Select first template
      const templateCard = page.locator('[class*="template-card"]').first();
      await templateCard.click();
    });

    await test.step('Verify PDF generation starts', async () => {
      // Should show generating state or open new window
      await expect(page.locator('text=/Generating|Loading/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test('06 - Verify AI prompt quality', async ({ page }) => {
    // Login and create optimized resume
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    const fileInput = page.locator('input[type="file"]');
    const tempFilePath = path.join(process.cwd(), 'temp-resume.txt');
    const fs = require('fs');
    fs.writeFileSync(tempFilePath, SAMPLE_RESUME);
    await fileInput.setInputFiles(tempFilePath);
    await page.waitForTimeout(3000);

    const optimizeButton = page.locator('button:has-text("Optimize")');
    await optimizeButton.click();
    await page.waitForSelector('text=/Your Optimized/', { timeout: 60000 });

    await test.step('Verify optimized resume has action verbs', async () => {
      const optimizedText = await page.locator('[class*="text-content"]').last().textContent() || '';

      // Check for strong action verbs from our AI prompt
      const actionVerbs = ['developed', 'led', 'managed', 'created', 'implemented', 'achieved', 'improved'];
      const hasActionVerbs = actionVerbs.some(verb => optimizedText.toLowerCase().includes(verb));
      expect(hasActionVerbs).toBeTruthy();
    });

    await test.step('Verify job descriptions stay with correct jobs', async () => {
      const optimizedText = await page.locator('[class*="text-content"]').last().textContent() || '';

      // Check that "TechCorp" and "StartupXYZ" are still present
      expect(optimizedText).toContain('TechCorp');
      expect(optimizedText).toContain('StartupXYZ');
    });

    await test.step('Verify formatting is ATS-friendly', async () => {
      const optimizedText = await page.locator('[class*="text-content"]').last().textContent() || '';

      // Should have bullet points or clear formatting
      const hasBullets = optimizedText.includes('•') || optimizedText.includes('-');
      expect(hasBullets).toBeTruthy();
    });
  });

  test('07 - Clean up test files', async ({}) => {
    const fs = require('fs');
    const tempFilePath = path.join(process.cwd(), 'temp-resume.txt');

    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });
});
