import { Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { JobApplication, CreateJobApplicationDto, UpdateJobApplicationDto } from '../models/job-application.model';

@Injectable({
  providedIn: 'root'
})
export class JobApplicationService {
  applications = signal<JobApplication[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor(private authService: AuthService) {}

  async loadApplications(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const supabase = this.authService.getSupabaseClient();
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.applications.set(data || []);
    } catch (err: any) {
      console.error('Error loading applications:', err);
      this.error.set(err.message || 'Failed to load job applications');
    } finally {
      this.isLoading.set(false);
    }
  }

  async createApplication(application: CreateJobApplicationDto): Promise<JobApplication | null> {
    this.error.set(null);

    try {
      const supabase = this.authService.getSupabaseClient();
      const user = this.authService.currentUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('job_applications')
        .insert([{
          ...application,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      this.applications.update(apps => [data, ...apps]);

      return data;
    } catch (err: any) {
      console.error('Error creating application:', err);
      this.error.set(err.message || 'Failed to create job application');
      return null;
    }
  }

  async updateApplication(id: string, updates: UpdateJobApplicationDto): Promise<boolean> {
    this.error.set(null);

    try {
      const supabase = this.authService.getSupabaseClient();
      const { data, error } = await supabase
        .from('job_applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      this.applications.update(apps =>
        apps.map(app => app.id === id ? data : app)
      );

      return true;
    } catch (err: any) {
      console.error('Error updating application:', err);
      this.error.set(err.message || 'Failed to update job application');
      return false;
    }
  }

  async deleteApplication(id: string): Promise<boolean> {
    this.error.set(null);

    try {
      const supabase = this.authService.getSupabaseClient();
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      this.applications.update(apps => apps.filter(app => app.id !== id));

      return true;
    } catch (err: any) {
      console.error('Error deleting application:', err);
      this.error.set(err.message || 'Failed to delete job application');
      return false;
    }
  }

  getApplicationsByStatus(status: string): JobApplication[] {
    return this.applications().filter(app => app.status === status);
  }

  getApplicationStats() {
    const apps = this.applications();
    return {
      total: apps.length,
      saved: apps.filter(app => app.status === 'saved').length,
      applied: apps.filter(app => app.status === 'applied').length,
      interviewing: apps.filter(app => app.status === 'interviewing').length,
      offered: apps.filter(app => app.status === 'offered').length,
      rejected: apps.filter(app => app.status === 'rejected').length
    };
  }
}
