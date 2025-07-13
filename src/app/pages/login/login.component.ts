import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  showPassword = signal(false);
  error = signal('');
  isSubmitting = signal(false);

  loginForm = this.fb.group({
    email: ['admin@company.com', [Validators.required, Validators.email]],
    password: ['password123', [Validators.required]],
  });

  toggleShowPassword() {
    this.showPassword.update((value) => !value);
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.isSubmitting.set(true);
    this.error.set('');
    const { email, password } = this.loginForm.value;
    this.authService
      .login(email!, password!)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        error: (err) => {
          this.error.set('Email atau password salah');
          console.error('Login failed', err);
        },
      });
  }
}
