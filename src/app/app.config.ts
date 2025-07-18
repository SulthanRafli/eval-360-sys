import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { APP_ROUTES } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(APP_ROUTES),
    provideAnimationsAsync(),
    provideAnimations(),
    provideCharts(withDefaultRegisterables()),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()), provideFirebaseApp(() => initializeApp({ projectId: "eval360sys", appId: "1:1015099520347:web:5ca19154879af2e5d9167e", storageBucket: "eval360sys.firebasestorage.app", apiKey: "AIzaSyAEObUjrG2Zppm_OGeb24R9_Jl-dXKmMg0", authDomain: "eval360sys.firebaseapp.com", messagingSenderId: "1015099520347" })), provideAuth(() => getAuth()), provideFirestore(() => getFirestore()),
  ],
};
