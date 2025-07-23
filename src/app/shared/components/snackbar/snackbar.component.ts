import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SnackbarMessage,
  SnackbarService,
} from '../../services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './snackbar.component.html',
  styles: [
    `
      .animate-slide-in {
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      /* Optional: Add slide out animation */
      .animate-slide-out {
        animation: slideOut 0.3s ease-in forwards;
      }

      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `,
  ],
})
export class SnackbarComponent {
  snackbarService = inject(SnackbarService);

  getSnackbarClass(type: SnackbarMessage['type']): string {
    const baseClasses = 'border-l-4';

    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-50 border-green-400 text-green-800`;
      case 'error':
        return `${baseClasses} bg-red-50 border-red-400 text-red-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 border-yellow-400 text-yellow-800`;
      case 'info':
      default:
        return `${baseClasses} bg-blue-50 border-blue-400 text-blue-800`;
    }
  }
}
