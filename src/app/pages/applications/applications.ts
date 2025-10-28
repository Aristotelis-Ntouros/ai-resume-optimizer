import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { JobApplicationService } from '../../services/job-application.service';
import { JobApplication } from '../../models/job-application.model';

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
    private router: Router
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
        jobDescription: app.job_description,
        jobTitle: app.job_title,
        companyName: app.company_name
      }
    });
  }
}
