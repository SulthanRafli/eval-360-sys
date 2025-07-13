import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { of, timer, throwError, switchMap } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { User } from '../models/app.types';
import { mockUsers } from '../data/mock-data';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  currentUser = signal<User | null | undefined>(undefined);
  isLoading = signal<boolean>(true);

  constructor(private router: Router) {
    this.loadInitialUser();
  }

  private loadInitialUser() {
    this.isLoading.set(true);
    // Simulate async check
    timer(500).subscribe(() => {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        this.currentUser.set(JSON.parse(storedUser));
      } else {
        this.currentUser.set(null);
      }
      this.isLoading.set(false);
    });
  }

  login(email: string, password: string) {
    this.isLoading.set(true);

    const foundUser = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (foundUser && password === 'password123') {
      return timer(1000).pipe(
        tap(() => {
          this.currentUser.set(foundUser);
          localStorage.setItem('currentUser', JSON.stringify(foundUser));
          this.isLoading.set(false);
          this.router.navigate(['/']);
        })
      );
    } else {
      return timer(1000).pipe(
        tap(() => {
          this.isLoading.set(false);
        }),
        switchMap(() => throwError(() => new Error('Invalid credentials')))
      );
    }
  }

  logout() {
    localStorage.removeItem('currentUser');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
