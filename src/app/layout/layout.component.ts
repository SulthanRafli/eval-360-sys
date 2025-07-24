import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../shared/services/auth.service';
import {
  Award,
  Bell,
  BellDot,
  Calculator,
  ClipboardPenLine,
  LayoutDashboard,
  LogOut,
  LucideAngularModule,
  Menu,
  PenTool,
  Settings,
  User,
  Users,
} from 'lucide-angular';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent {
  readonly Menu = Menu;
  readonly Bell = Bell;
  readonly BellDot = BellDot;
  readonly User = User;
  readonly LogOut = LogOut;
  readonly PenTool = PenTool;

  authService = inject(AuthService);
  isSidebarOpen = signal(false);

  // Navigation items with inline SVG for icons
  navigation = computed(() => {
    const user = this.authService.currentUserProfile();
    let navigationFiltered = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      { name: 'Karyawan', href: '/employees', icon: Users },
      {
        name: 'Evaluasi 360°',
        href: '/evaluations',
        icon: ClipboardPenLine,
      },
      { name: 'Peringkat', href: '/ranking', icon: Award },
      { name: 'Bobot AHP', href: '/ahp', icon: Calculator },
      { name: 'Kriteria', href: '/criteria', icon: Settings },
    ];
    if (user?.level !== 'admin') {
      navigationFiltered = [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          name: 'Evaluasi 360°',
          href: '/evaluations',
          icon: ClipboardPenLine,
        },
        { name: 'Peringkat', href: '/ranking', icon: Award },
      ];
    }
    return navigationFiltered;
  });

  public logout() {
    this.authService.logout();
  }

  public toggleSidebar() {
    this.isSidebarOpen.update((value) => !value);
  }

  initials(employeeName: string): string {
    if (!employeeName) return '';
    return employeeName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
