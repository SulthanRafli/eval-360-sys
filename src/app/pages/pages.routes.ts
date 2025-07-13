import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EmployeesComponent } from './employees/employees.component';
import { EvaluationsComponent } from './evaluations/evaluations.component';
import { AhpComponent } from './ahp/ahp.component';
import { RankingComponent } from './ranking/ranking.component';
import { ReportsComponent } from './reports/reports.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { SettingsComponent } from './settings/settings.component';

export const pagesRoutes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'employees', component: EmployeesComponent },
  { path: 'evaluations', component: EvaluationsComponent },
  { path: 'ahp', component: AhpComponent },
  { path: 'ranking', component: RankingComponent },
  { path: 'reports', component: ReportsComponent },
  { path: 'analytics', component: AnalyticsComponent },
  { path: 'settings', component: SettingsComponent },
];
