import { Injectable, signal } from '@angular/core';

export interface SnackbarMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SnackbarService {
  private messages = signal<SnackbarMessage[]>([]);

  // Expose messages as readonly
  readonly messages$ = this.messages.asReadonly();

  show(
    message: string,
    type: SnackbarMessage['type'] = 'info',
    duration: number = 5000
  ): void {
    const id = this.generateId();
    const snackbar: SnackbarMessage = {
      id,
      message,
      type,
      duration,
    };

    // Add message to the array
    this.messages.update((current) => [...current, snackbar]);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  remove(id: string): void {
    this.messages.update((current) => current.filter((msg) => msg.id !== id));
  }

  clear(): void {
    this.messages.set([]);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
