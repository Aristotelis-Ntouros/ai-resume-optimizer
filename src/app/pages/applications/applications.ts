import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { JobApplicationService } from '../../services/job-application.service';
import { JobApplication } from '../../models/job-application.model';
import { FileService } from '../../services/file.service';
import { AuthService } from '../../services/auth.service';
import { ResumeService } from '../../services/resume.service';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './applications.html',
  styleUrl: './applications.css'
})
export class Applications implements OnInit {
  selectedStatus = signal<string>('all');
  showNewApplicationModal = signal(false);
  isCreating = signal(false);
  showResumePreviewModal = signal(false);
  selectedResumeHtml = signal<string>('');
  currentApplication = signal<JobApplication | null>(null);
  showTemplateSelector = signal(false);
  isGeneratingTemplate = signal(false);
  selectedTemplate = signal<string>('modern');

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

  // New application form
  newApplication = {
    company_name: '',
    job_title: '',
    job_description: '',
    job_url: '',
    location: '',
    status: 'saved' as const
  };

  statusOptions = [
    { value: 'all', label: 'All Applications', color: 'gray' },
    { value: 'saved', label: 'Saved', color: 'blue' },
    { value: 'applied', label: 'Applied', color: 'purple' },
    { value: 'interviewing', label: 'Interviewing', color: 'yellow' },
    { value: 'offered', label: 'Offered', color: 'green' },
    { value: 'rejected', label: 'Rejected', color: 'red' }
  ];

  constructor(
    public jobAppService: JobApplicationService,
    private router: Router,
    private fileService: FileService,
    public authService: AuthService,
    private resumeService: ResumeService
  ) {}

  ngOnInit() {
    this.jobAppService.loadApplications();
  }

  get filteredApplications(): JobApplication[] {
    const status = this.selectedStatus();
    if (status === 'all') {
      return this.jobAppService.applications();
    }
    return this.jobAppService.getApplicationsByStatus(status);
  }

  get stats(): any {
    return this.jobAppService.getApplicationStats();
  }

  openNewApplicationModal() {
    this.showNewApplicationModal.set(true);
  }

  closeModal() {
    this.showNewApplicationModal.set(false);
    this.resetForm();
  }

  resetForm() {
    this.newApplication = {
      company_name: '',
      job_title: '',
      job_description: '',
      job_url: '',
      location: '',
      status: 'saved'
    };
  }

  async createApplication() {
    if (!this.newApplication.company_name || !this.newApplication.job_title) {
      return;
    }

    this.isCreating.set(true);

    const result = await this.jobAppService.createApplication(this.newApplication);

    if (result) {
      this.closeModal();
    }

    this.isCreating.set(false);
  }

  async updateStatus(appId: string, newStatus: string) {
    const updates: any = {
      status: newStatus as any
    };

    if (newStatus === 'applied') {
      updates.applied_at = new Date().toISOString();
    }

    await this.jobAppService.updateApplication(appId, updates);
  }

  async deleteApplication(appId: string) {
    if (confirm('Are you sure you want to delete this application?')) {
      await this.jobAppService.deleteApplication(appId);
    }
  }

  getStatusColor(status: string): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option?.color || 'gray';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  matchResume(app: JobApplication) {
    // Navigate to dashboard with the job description as state
    this.router.navigate(['/dashboard'], {
      state: {
        applicationId: app.id,
        jobDescription: app.job_description,
        jobTitle: app.job_title,
        companyName: app.company_name
      }
    });
  }

  viewTailoredResume(app: JobApplication) {
    if (!app.tailored_resume_text) return;

    this.currentApplication.set(app);
    this.showTemplateSelector.set(true);
  }

  closeTemplateSelector() {
    this.showTemplateSelector.set(false);
    this.selectedTemplate.set('modern');
  }

  async generateResumeWithTemplate(templateId: string) {
    const app = this.currentApplication();
    if (!app || !app.tailored_resume_text) return;

    this.isGeneratingTemplate.set(true);

    // Open window IMMEDIATELY to avoid popup blocker
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Could not open print window. Please allow popups and try again.');
      this.isGeneratingTemplate.set(false);
      return;
    }

    // Show loading message
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .loading {
            text-align: center;
            color: white;
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          h2 { margin: 0 0 10px; font-size: 24px; }
          p { margin: 0; opacity: 0.9; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="loading">
          <div class="spinner"></div>
          <h2>Generating Your Resume</h2>
          <p>Creating professional ${templateId} template...</p>
        </div>
      </body>
      </html>
    `);

    try {
      // Parse the CV data
      const cvData = await this.resumeService.parseCV(app.tailored_resume_text);

      // Generate template HTML
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
        // Replace loading screen with actual resume
        printWindow.document.open();
        printWindow.document.write(data.html);
        printWindow.document.close();
        printWindow.focus();

        // Auto-trigger print dialog after a short delay
        setTimeout(() => {
          printWindow.print();
        }, 500);

        this.closeTemplateSelector();
      }
    } catch (error) {
      console.error('Error generating template:', error);
      printWindow.close();
      alert('Failed to generate resume template. Please try again.');
    } finally {
      this.isGeneratingTemplate.set(false);
    }
  }
}
