import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { authGuard } from './shared/guard/auth.guard';
import { LoginComponent } from './pages/login/login.component';

export const APP_ROUTES: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
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
