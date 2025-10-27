import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ResumeService, Rewrite } from '../../services/resume.service';
import { FileService } from '../../services/file.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  uploadedFile = signal<File | null>(null);
  originalText = signal('');
  rewrittenText = signal('');
  currentView = signal<'upload' | 'result' | 'job-match'>('upload');
  errorMessage = signal('');
  originalAtsScore = signal<number | null>(null);
  rewrittenAtsScore = signal<number | null>(null);
  showTemplateSelector = signal(false);
  selectedTemplate = signal<string>('modern');
  parsedCVData = signal<any>(null);
  isGeneratingTemplate = signal(false);
  jobDescription = signal('');
  isDragging = signal(false);
  showJobMatcher = signal(false);
  isAnalyzingMatch = signal(false);
  isTailoringResume = signal(false);

  templates = [
    {
      id: 'modern',
      name: 'Modern Tech',
      description: 'Clean and minimal, perfect for tech roles',
      preview: '🎨'
    },
    {
      id: 'executive',
      name: 'Executive',
      description: 'Professional and bold, ideal for leadership',
      preview: '👔'
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Ultra-clean, distraction-free design',
      preview: '⚡'
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Stylish yet ATS-safe, for creative roles',
      preview: '✨'
    },
    {
      id: 'academic',
      name: 'Academic',
      description: 'Traditional format for research/academic',
      preview: '🎓'
    }
  ];

  constructor(
    public authService: AuthService,
    public resumeService: ResumeService,
    private fileService: FileService,
    private router: Router
  ) {}

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.resumeService.fetchRewrites();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    await this.processFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  async onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await this.processFile(file);
  }

  private async processFile(file: File) {
    // Validate file type
    const validTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(fileExtension)) {
      this.errorMessage.set('Please upload a PDF, DOCX, DOC, or TXT file');
      return;
    }

    this.uploadedFile.set(file);
    this.errorMessage.set('');

    try {
      const text = await this.fileService.extractTextFromFile(file);
      this.originalText.set(text);

      // Automatically analyze ATS score
      await this.analyzeATS();
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to extract text from file');
      this.uploadedFile.set(null);
    }
  }

  async analyzeATS() {
    if (!this.originalText()) return;

    this.errorMessage.set('');

    try {
      await this.resumeService.analyzeATS(this.originalText());
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to analyze ATS score');
    }
  }

  async rewriteCV() {
    if (!this.originalText()) return;

    this.errorMessage.set('');

    try {
      // Store original ATS score
      this.originalAtsScore.set(this.resumeService.atsScore()?.score || null);

      const rewritten = await this.resumeService.rewriteCV(this.originalText());
      this.rewrittenText.set(rewritten);

      // Analyze the rewritten version's ATS score
      const newAtsScore = await this.resumeService.analyzeATS(rewritten);
      this.rewrittenAtsScore.set(newAtsScore.score);

      this.currentView.set('result');
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to rewrite CV');
    }
  }


  async downloadPDF() {
    if (!this.rewrittenText()) return;

    // Show template selector
    this.showTemplateSelector.set(true);
  }

  async downloadWithTemplate(templateId: string) {
    this.errorMessage.set('');
    this.isGeneratingTemplate.set(true);

    try {
      console.log('Starting template generation:', templateId);

      // Parse the rewritten CV to extract structured data
      const cvData = await this.resumeService.parseCV(this.rewrittenText());
      this.parsedCVData.set(cvData);

      // Generate template HTML on server
      const response = await fetch('/api/generate-template-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvData, templateName: templateId })
      });

      if (!response.ok) {
        throw new Error('Failed to generate template');
      }

      const data = await response.json();

      if (data.html) {
        // Open print dialog with the generated template
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          // Give it a moment to load, then trigger print
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        }
        this.showTemplateSelector.set(false);
      } else {
        throw new Error('No HTML template received');
      }

    } catch (error: any) {
      console.error('Template generation error:', error);
      this.errorMessage.set(error.message || 'Failed to generate template');
    } finally {
      this.isGeneratingTemplate.set(false);
    }
  }

  closeTemplateSelector() {
    this.showTemplateSelector.set(false);
  }

  getSelectedTemplateName(): string {
    return this.templates.find(t => t.id === this.selectedTemplate())?.name || 'Template';
  }

  startNew() {
    this.uploadedFile.set(null);
    this.originalText.set('');
    this.rewrittenText.set('');
    this.currentView.set('upload');
    this.errorMessage.set('');
  }

  viewRewrite(rewrite: Rewrite) {
    this.originalText.set(rewrite.original_text);
    this.rewrittenText.set(rewrite.rewritten_text);
    this.currentView.set('result');
  }

  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Show success message
      const originalError = this.errorMessage();
      this.errorMessage.set('✅ Copied to clipboard! Now paste it into your original CV document.');
      setTimeout(() => {
        if (this.errorMessage() === '✅ Copied to clipboard! Now paste it into your original CV document.') {
          this.errorMessage.set(originalError);
        }
      }, 5000);
    } catch (error) {
      this.errorMessage.set('Failed to copy to clipboard. Please manually select and copy the text.');
    }
  }

  toggleJobMatcher() {
    this.showJobMatcher.set(!this.showJobMatcher());
  }

  async analyzeJobMatch() {
    if (!this.originalText() || !this.jobDescription()) {
      this.errorMessage.set('Please upload a resume and paste a job description');
      return;
    }

    this.isAnalyzingMatch.set(true);
    this.errorMessage.set('');

    try {
      await this.resumeService.analyzeJobMatch(this.originalText(), this.jobDescription());
      this.currentView.set('job-match');
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to analyze job match');
    } finally {
      this.isAnalyzingMatch.set(false);
    }
  }

  async tailorResumeForJob() {
    if (!this.originalText() || !this.jobDescription()) {
      this.errorMessage.set('Please upload a resume and paste a job description');
      return;
    }

    this.isTailoringResume.set(true);
    this.errorMessage.set('');

    try {
      const tailored = await this.resumeService.tailorResumeForJob(
        this.originalText(),
        this.jobDescription()
      );

      this.rewrittenText.set(tailored);

      // Analyze the tailored version's match score
      await this.resumeService.analyzeJobMatch(tailored, this.jobDescription());

      this.currentView.set('result');
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to tailor resume');
    } finally {
      this.isTailoringResume.set(false);
    }
  }

  getMatchScoreColor(score: number): string {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  }

  getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent Match';
    if (score >= 75) return 'Good Match';
    if (score >= 60) return 'Fair Match';
    return 'Poor Match';
  }
}
