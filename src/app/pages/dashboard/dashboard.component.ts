import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Award,
  Calculator,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  LucideAngularModule,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
  public Calendar = CalendarDays;
  public TrendingUp = TrendingUp;
  public TrendingDown = TrendingDown;
  public ClipboardList = ClipboardList;
  public Award = Award;
  public Calculator = Calculator;
  // Data for the statistics cards
  stats = [
    {
      name: 'Total Karyawan',
      value: 17, // From mockEmployees.length
      icon: Users,
      color: 'blue',
      change: '+2',
      changeType: 'increase',
    },
    {
      name: 'Evaluasi Selesai',
      value: 58, // From mockEvaluations.filter(e => e.status === 'completed').length
      icon: CheckCircle2,
      color: 'green',
      change: '+12',
      changeType: 'increase',
    },
    {
      name: 'Evaluasi Pending',
      value: 10, // From mockEmployees.length * 4 - mockEvaluations.length
      icon: ClipboardList,
      color: 'yellow',
      change: '-5',
      changeType: 'decrease',
    },
    {
      name: 'Rata-rata Skor',
      value: '4.2',
      icon: Award,
      color: 'purple',
      change: '+0.3',
      changeType: 'increase',
    },
  ];

  // Data for the recent activities feed
  recentActivities = [
    {
      id: 1,
      type: 'evaluation_completed',
      message: 'Evaluasi 360° untuk Budi Santoso telah selesai',
      time: '2 jam yang lalu',
      user: 'Andi Pratama',
      icon: CheckCircle2,
      color: 'blue',
    },
    {
      id: 2,
      type: 'new_employee',
      message: 'Karyawan baru ditambahkan ke sistem',
      time: '4 jam yang lalu',
      user: 'Admin System',
      icon: Users,
      color: 'green',
    },
    {
      id: 3,
      type: 'ahp_updated',
      message: 'Bobot kriteria AHP telah diperbarui',
      time: '1 hari yang lalu',
      user: 'Admin System',
      icon: ClipboardList,
      color: 'yellow',
    },
  ];

  // Data for the department statistics
  departmentStats = [
    { name: 'Frontend Developer', senior: 2, junior: 6, total: 8 },
    { name: 'Backend Developer', senior: 2, junior: 5, total: 7 },
    { name: 'DevOps', senior: 1, junior: 1, total: 2 },
  ];

  constructor() {}

  // Helper function to get the correct CSS class for stat card colors
  getStatColorClass(color: string): string {
    switch (color) {
      case 'blue':
        return 'bg-blue-500';
      case 'green':
        return 'bg-green-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'purple':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  }
}
