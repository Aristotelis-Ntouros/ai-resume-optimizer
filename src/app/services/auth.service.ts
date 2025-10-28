import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  currentUser = signal<User | null>(null);
  isAuthenticated = signal(false);

  constructor(private router: Router) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true
        }
      }
    );

    // Handle OAuth callback from URL
    this.handleOAuthCallback();

    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, 'User:', session?.user?.email);

      if (event === 'SIGNED_IN') {
        if (session?.user) {
          console.log('User signed in successfully');
          this.currentUser.set(session.user);
          this.isAuthenticated.set(true);

          // Navigate to dashboard only if we're on login/signup pages
          const currentPath = window.location.pathname;
          const shouldRedirect = ['/', '/login', '/signup'].includes(currentPath);

          if (shouldRedirect) {
            console.log('Navigating to dashboard from auth page');
            await this.router.navigate(['/dashboard']);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
      } else if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          console.log('Initial session detected');
          this.currentUser.set(session.user);
          this.isAuthenticated.set(true);
        }
      }
    });
  }

  private async handleOAuthCallback(): Promise<void> {
    try {
      // Check if we're coming back from OAuth
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);

      if (hashParams.has('access_token') || queryParams.has('code')) {
        console.log('OAuth callback detected, exchanging code for session');

        const { data, error } = await this.supabase.auth.exchangeCodeForSession(
          queryParams.get('code') || ''
        );

        if (error) {
          console.error('Error exchanging code:', error);
          return;
        }

        if (data?.session?.user) {
          console.log('Session established from OAuth:', data.session.user.email);
          this.currentUser.set(data.session.user);
          this.isAuthenticated.set(true);
          await this.router.navigate(['/dashboard']);
        }
      } else {
        // No OAuth callback, check for existing session
        await this.checkSession();
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      // Fallback to regular session check
      await this.checkSession();
    }
  }

  private async checkSession(retries = 5): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const { data: { session }, error } = await this.supabase.auth.getSession();

        if (error) {
          console.warn(`Session check attempt ${i + 1} error:`, error.message);
          if (error.message.includes('lock') && i < retries - 1) {
            // Wait longer for lock errors
            await new Promise(resolve => setTimeout(resolve, 200 * (i + 1)));
            continue;
          }
          return;
        }

        if (session?.user) {
          console.log('Session found:', session.user.email);
          this.currentUser.set(session.user);
          this.isAuthenticated.set(true);
        } else {
          console.log('No session found');
        }
        return;
      } catch (error: any) {
        console.warn(`Session check attempt ${i + 1} failed:`, error.message);
        if (i < retries - 1) {
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 200 * (i + 1)));
        }
      }
    }
    console.warn('Session check failed after all retries');
  }

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    this.currentUser.set(data.user);
    this.isAuthenticated.set(true);
    return data;
  }

  async signInWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        skipBrowserRedirect: false
      }
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;

    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/']);
  }

  getSupabaseClient() {
    return this.supabase;
  }
}
