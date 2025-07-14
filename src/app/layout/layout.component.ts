import { Component, inject, signal } from '@angular/core';
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
  public navigation = [
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
    { name: 'AHP Setup', href: '/ahp', icon: Calculator },
    { name: 'Ranking', href: '/ranking', icon: Award },
  ];

  public logout() {
    this.authService.logout();
  }

  public toggleSidebar() {
    this.isSidebarOpen.update((value) => !value);
  }
}
