import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './pages/login/login.component';
import { authGuard } from './shared/guard/auth.guard';

export const APP_ROUTES: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    canActivate: [authGuard],
    component: LayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./pages/pages.module').then((m) => m.PagesModule),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
