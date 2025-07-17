import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EmployeesComponent } from './employees/employees.component';
import { EvaluationsComponent } from './evaluations/evaluations.component';
import { AhpComponent } from './ahp/ahp.component';
import { RankingComponent } from './ranking/ranking.component';
import { CriteriaComponent } from './criteria/criteria.component';

export const pagesRoutes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'employees', component: EmployeesComponent },
  { path: 'evaluations', component: EvaluationsComponent },
  { path: 'ranking', component: RankingComponent },
  { path: 'ahp', component: AhpComponent },
  { path: 'criteria', component: CriteriaComponent },
];
