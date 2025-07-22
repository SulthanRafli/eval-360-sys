import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  limit,
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Employee } from '../models/app.types';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router: Router = inject(Router);
  private firestore: Firestore = inject(Firestore);
  private readonly USER_STORAGE_KEY = 'evalsys_user';

  public currentUserProfile = signal<Employee | null>(null);

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const userJson = localStorage.getItem(this.USER_STORAGE_KEY);
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as Employee;
        this.currentUserProfile.set(user);
      } catch (e) {
        console.error('Gagal mem-parsing data pengguna dari localStorage', e);
        localStorage.removeItem(this.USER_STORAGE_KEY);
      }
    }
  }

  login(email: string, password: string): Observable<Employee | null> {
    const employeesCollection = collection(this.firestore, 'employees');
    const q = query(employeesCollection, where('email', '==', email), limit(1));

    return from(getDocs(q)).pipe(
      map((querySnapshot) => {
        if (querySnapshot.empty) {
          console.error(
            'Tidak ada pengguna yang ditemukan dengan email tersebut.'
          );
          return null;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() } as Employee;

        if (userData.password === password) {
          localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(userData));
          this.currentUserProfile.set(userData);
          this.router.navigate(['/dashboard']);
          return userData;
        } else {
          console.error('Password salah.');
          return null;
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.USER_STORAGE_KEY);
    this.currentUserProfile.set(null);
    this.router.navigate(['/login']);
  }
}
