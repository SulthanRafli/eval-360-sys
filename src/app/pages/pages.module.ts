import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { pagesRoutes } from './pages.routes';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EmployeesComponent } from './employees/employees.component';
import { EvaluationsComponent } from './evaluations/evaluations.component';
import { AhpComponent } from './ahp/ahp.component';
import { RankingComponent } from './ranking/ranking.component';
import { CriteriaComponent } from './criteria/criteria.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(pagesRoutes),
    DashboardComponent,
    EmployeesComponent,
    EvaluationsComponent,
    AhpComponent,
    RankingComponent,
    CriteriaComponent,
  ],
})
export class PagesModule {}
