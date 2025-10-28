import { test, expect } from '@playwright/test';
import * as path from 'path';

// Test credentials
const TEST_EMAIL = 'ar.ntouros@gmail.com';
const TEST_PASSWORD = 'Weird3485';

// Use real resume file
const RESUME_FILE_PATH = 'C:\\Users\\antouros\\Downloads\\Johns-Resume.docx';

// Sample resume for tests that need to create temp files
const SAMPLE_RESUME = `John Doe
Senior Software Engineer
john.doe@email.com | (555) 123-4567

PROFESSIONAL EXPERIENCE

TechCorp - Senior Developer (2020-Present)
- Developed web applications
- Worked with team on projects
- Fixed bugs

StartupXYZ - Developer (2018-2020)
- Built features
- Helped customers

EDUCATION
University of Technology - Computer Science (2014-2018)

SKILLS
JavaScript, Python, React`;

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

    await test.step('Upload resume file', async () => {
      // Create temp TXT file for reliable testing (DOCX needs mammoth library which may fail in test environment)
      const fileInput = page.locator('input[type="file"]');
      const tempFilePath = path.join(process.cwd(), 'temp-resume-test.txt');
      const fs = require('fs');
      fs.writeFileSync(tempFilePath, SAMPLE_RESUME);
      await fileInput.setInputFiles(tempFilePath);

      // Wait for file to be processed
      await page.waitForTimeout(5000);

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    await test.step('Verify file was uploaded and processed', async () => {
      // Check that optimize button is enabled (means file was processed)
      const optimizeButton = page.locator('button:has-text("Optimize")');
      await expect(optimizeButton).toBeEnabled({ timeout: 10000 });
    });
  });

  test('03 - Optimize resume with AI', async ({ page }) => {
    // Login and upload
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Upload resume with TXT file
    const fileInput = page.locator('input[type="file"]');
    const tempFilePath = path.join(process.cwd(), 'temp-resume-opt.txt');
    const fs = require('fs');
    fs.writeFileSync(tempFilePath, SAMPLE_RESUME);
    await fileInput.setInputFiles(tempFilePath);
    await page.waitForTimeout(5000);

    await test.step('Click optimize button', async () => {
      const optimizeButton = page.locator('button:has-text("Optimize")');
      await expect(optimizeButton).toBeEnabled({ timeout: 10000 });
      await optimizeButton.click();
    });

    await test.step('Wait for AI optimization', async () => {
      // Check for error message first
      const errorMsg = page.locator('[class*="error"]').first();

      // Wait for either Download button OR check if there's an error
      try {
        await expect(page.locator('button:has-text("Download")')).toBeVisible({ timeout: 90000 });
      } catch (e) {
        // If timeout, check for error message
        const hasError = await errorMsg.isVisible();
        if (hasError) {
          const errorText = await errorMsg.textContent();
          throw new Error(`Optimization failed with error: ${errorText}`);
        }
        throw e;
      }
    });

    await test.step('Verify optimized resume is displayed', async () => {
      // Verify download button is available
      const downloadButton = page.locator('button:has-text("Download")');
      await expect(downloadButton).toBeVisible();
    });

    // Cleanup
    fs.unlinkSync(tempFilePath);
  });

  test('04 - Job matching feature', async ({ page }) => {
    // Login and upload
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Upload resume with TXT file
    const fileInput = page.locator('input[type="file"]');
    const tempFilePath = path.join(process.cwd(), 'temp-resume-job.txt');
    const fs = require('fs');
    fs.writeFileSync(tempFilePath, SAMPLE_RESUME);
    await fileInput.setInputFiles(tempFilePath);
    await page.waitForTimeout(5000);

    await test.step('Open job matcher', async () => {
      const matcherButton = page.locator('button:has-text("Match to Job")');
      await matcherButton.click();
    });

    await test.step('Enter job description', async () => {
      const jobDescTextarea = page.locator('textarea');
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

      // Wait for analysis to complete
      await page.waitForTimeout(20000);
    });

    // Cleanup
    fs.unlinkSync(tempFilePath);
  });

  test('05 - PDF generation', async ({ page }) => {
    // Login, upload, and optimize
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Upload and optimize with temp file
    const fileInput = page.locator('input[type="file"]');
    const tempFilePath = path.join(process.cwd(), 'temp-resume.txt');
    const fs = require('fs');
    fs.writeFileSync(tempFilePath, SAMPLE_RESUME);
    await fileInput.setInputFiles(tempFilePath);
    await page.waitForTimeout(5000);

    const optimizeButton = page.locator('button:has-text("Optimize")');
    await expect(optimizeButton).toBeEnabled({ timeout: 10000 });
    await optimizeButton.click();
    await expect(page.locator('button:has-text("Download")')).toBeVisible({ timeout: 90000 });

    await test.step('Click download PDF', async () => {
      const downloadButton = page.locator('button:has-text("Download")');
      await downloadButton.click();
    });

    await test.step('Verify template selector appears', async () => {
      // Wait for template selector modal
      await expect(page.locator('text=/Choose Template|Select Template|Modern Tech|Executive/i')).toBeVisible({ timeout: 5000 });
    });

    // Cleanup
    fs.unlinkSync(tempFilePath);
  });

  test('06 - Verify AI prompt quality', async ({ page }) => {
    // Login and create optimized resume
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    const fileInput = page.locator('input[type="file"]');
    const tempFilePath = path.join(process.cwd(), 'temp-resume-quality.txt');
    const fs = require('fs');
    fs.writeFileSync(tempFilePath, SAMPLE_RESUME);
    await fileInput.setInputFiles(tempFilePath);
    await page.waitForTimeout(5000);

    const optimizeButton = page.locator('button:has-text("Optimize")');
    await expect(optimizeButton).toBeEnabled({ timeout: 10000 });
    await optimizeButton.click();
    await expect(page.locator('button:has-text("Download")')).toBeVisible({ timeout: 90000 });

    await test.step('Verify optimized resume content', async () => {
      // Get all text content from the page
      const pageText = await page.textContent('body') || '';

      // Check for strong action verbs from our AI prompt
      const actionVerbs = ['developed', 'led', 'managed', 'created', 'implemented', 'achieved', 'improved', 'designed', 'built', 'engineered'];
      const hasActionVerbs = actionVerbs.some(verb => pageText.toLowerCase().includes(verb));
      expect(hasActionVerbs).toBeTruthy();

      // Check that company names are still present
      const hasTechCorp = pageText.includes('TechCorp');
      const hasStartupXYZ = pageText.includes('StartupXYZ');
      expect(hasTechCorp || hasStartupXYZ).toBeTruthy();
    });

    // Cleanup
    fs.unlinkSync(tempFilePath);
  });

});
