import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { pagesRoutes } from './pages.routes';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EmployeesComponent } from './employees/employees.component';
import { EvaluationsComponent } from './evaluations/evaluations.component';
import { AhpComponent } from './ahp/ahp.component';
import { RankingComponent } from './ranking/ranking.component';
import { ReportsComponent } from './reports/reports.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { SettingsComponent } from './settings/settings.component';
import { EmployeeCardComponent } from './employees/components/employee-card/employee-card.component';
import { EmployeeFiltersComponent } from './employees/components/employee-filters/employee-filters.component';
import { EmployeeFormModalComponent } from './employees/components/employee-form-modal/employee-form-modal.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(pagesRoutes),
    DashboardComponent,
    EmployeesComponent,
    EmployeeCardComponent,
    EmployeeFiltersComponent,
    EmployeeFormModalComponent,
    EvaluationsComponent,
    AhpComponent,
    RankingComponent,
    ReportsComponent,
    AnalyticsComponent,
    SettingsComponent,
  ],
})
export class PagesModule {}
