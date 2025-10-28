import { Component, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match');
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage.set('Password must be at least 6 characters');
      return;
    }

    this.isLoading.set(true);

    try {
      await this.authService.signUp(this.email, this.password);
      this.successMessage.set('Account created! Please check your email to verify your account.');

      // Auto sign in after 2 seconds
      setTimeout(async () => {
        try {
          await this.authService.signIn(this.email, this.password);
          this.router.navigate(['/dashboard']);
        } catch (error) {
          this.router.navigate(['/login']);
        }
      }, 2000);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to create account');
    } finally {
      this.isLoading.set(false);
    }
  }

  async signUpWithGoogle() {
    this.errorMessage.set('');
    this.isLoading.set(true);

    try {
      await this.authService.signInWithGoogle();
      // OAuth will redirect automatically
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to sign up with Google');
      this.isLoading.set(false);
    }
  }
}
