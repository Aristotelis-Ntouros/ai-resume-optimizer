import { Component, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = signal('');
  isLoading = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit() {
    this.errorMessage.set('');
    this.isLoading.set(true);

    try {
      await this.authService.signIn(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to sign in');
    } finally {
      this.isLoading.set(false);
    }
  }

  async signInWithGoogle() {
    this.errorMessage.set('');
    this.isLoading.set(true);

    try {
      await this.authService.signInWithGoogle();
      // OAuth will redirect automatically
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to sign in with Google');
      this.isLoading.set(false);
    }
  }
}
