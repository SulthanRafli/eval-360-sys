import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  Archive,
  Award,
  Calculator,
  CalendarDays,
  CheckCircle2,
  CircleCheck,
  ClipboardList,
  ClockArrowUp,
  FileText,
  LucideAngularModule,
  LucideIconData,
  PlusCircle,
  Settings,
  SquarePen,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-angular';
import { EvaluationService } from '../../shared/services/evaluation.service';
import { EmployeeService } from '../../shared/services/employee.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { CriteriaService } from '../../shared/services/criteria.service';
import { AuthService } from '../../shared/services/auth.service';
import { RecentActivitiesService } from '../../shared/services/recent-activities.service';
import moment from 'moment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  providers: [DatePipe],
})
export class DashboardComponent {
  public Calendar = CalendarDays;
  public TrendingUp = TrendingUp;
  public TrendingDown = TrendingDown;
  public ClipboardList = ClipboardList;
  public Award = Award;
  public Calculator = Calculator;
  public Archive = Archive;

  private evaluationService = inject(EvaluationService);
  private employeeService = inject(EmployeeService);
  private criteriaService = inject(CriteriaService);
  public authService = inject(AuthService);
  public activitiesService = inject(RecentActivitiesService);
  selectedPeriod = signal(moment().format('YYYY-MM'));

  evaluations = toSignal(
    this.evaluationService.getEvaluationsByPeriod(this.selectedPeriod()),
    { initialValue: [] }
  );
  allEmployees = toSignal(this.employeeService.getEmployees(), {
    initialValue: [],
  });
  allCriteria = toSignal(this.criteriaService.getCriteria(), {
    initialValue: [],
  });

  stats = computed(() => {
    const totalKaryawan = this.allEmployees().length;
    const totalCriteria = this.allCriteria().length;
    const totalComplete = this.evaluations().filter(
      (val) => val.status === 'completed'
    ).length;
    const totalPending = this.evaluations().filter(
      (val) => val.status === 'pending'
    ).length;

    return [
      {
        name: 'Total Kriteria',
        value: totalCriteria,
        icon: Settings,
        color: 'purple',
      },
      {
        name: 'Total Karyawan',
        value: totalKaryawan,
        icon: Users,
        color: 'blue',
      },

      {
        name: 'Evaluasi Selesai',
        value: totalComplete,
        icon: CheckCircle2,
        color: 'green',
      },
      {
        name: 'Evaluasi Pending',
        value: totalPending,
        icon: ClockArrowUp,
        color: 'yellow',
      },
    ];
  });
  recentActivities = toSignal(this.activitiesService.getRecentActivities(), {
    initialValue: [],
  });

  // Data for the department statistics
  departmentStats = computed(() => {
    const position = [
      'Frontend Developer',
      'Backend Developer',
      'DevOps Engineer',
    ];
    return position.map((val) => {
      const karyawanFilter = this.allEmployees().filter(
        (e) => e.position === val
      );
      const totalKaryawan = karyawanFilter.length;
      const totalSenior = karyawanFilter.filter(
        (k) => k.level === 'senior'
      ).length;
      const totalJunior = karyawanFilter.filter(
        (k) => k.level === 'junior'
      ).length;
      return {
        name: val,
        senior: totalSenior,
        junior: totalJunior,
        total: totalKaryawan,
      };
    });
  });

  getStatColorClass(color: string): string {
    switch (color) {
      case 'blue':
        return 'bg-blue-400';
      case 'green':
        return 'bg-green-400';
      case 'yellow':
        return 'bg-yellow-400';
      case 'purple':
        return 'bg-purple-400';
      case 'red':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  }

  getIcon(icon: string): LucideIconData {
    switch (icon) {
      case 'FileText':
        return FileText;
      case 'SquarePen':
        return SquarePen;
      case 'PlusCircle':
        return PlusCircle;
      case 'Trash2':
        return Trash2;
      case 'UserPlus':
        return UserPlus;
      case 'CircleCheck':
        return CircleCheck;
      default:
        return UserPlus;
    }
  }

  formatCreatedAt(timestamp: any): Date {
    const date = new Date(timestamp.seconds * 1000);
    return date;
  }
}
