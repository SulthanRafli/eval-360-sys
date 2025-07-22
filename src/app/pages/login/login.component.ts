import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../shared/services/auth.service';
import { FirebaseError } from '@angular/fire/app';
import {
  Eye,
  EyeClosed,
  Info,
  LoaderCircle,
  LucideAngularModule,
  PenTool,
} from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  readonly PenTool = PenTool;
  readonly Eye = Eye;
  readonly EyeClosed = EyeClosed;
  readonly LoaderCircle = LoaderCircle;
  readonly Info = Info;

  fb = inject(FormBuilder);
  authService = inject(AuthService);
  showPassword = signal(false);
  error = signal('');
  isSubmitting = signal(false);

  loginForm = this.fb.group({
    email: [null, [Validators.required, Validators.email]],
    password: [null, [Validators.required]],
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
          if (
            err.code === 'auth/user-not-found' ||
            err.code === 'auth/wrong-password' ||
            err.code === 'auth/invalid-credential'
          ) {
            this.error.set('The email or password you entered is incorrect.');
          } else {
            this.error.set('An error occurred. Please try again.');
          }
          this.error.set(err);
        },
      });
  }
}
