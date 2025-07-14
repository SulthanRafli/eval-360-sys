import {
  Component,
  Input,
  Output,
  EventEmitter,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee } from '../../models/app.types';
import { LucideAngularModule, TriangleAlert, X } from 'lucide-angular';

@Component({
  selector: 'app-delete-confirm-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './delete-confirm-modal.component.html',
})
export class DeleteConfirmModalComponent {
  readonly TriangleAlert = TriangleAlert;
  readonly X = X;

  @Input() employee: Employee | null = null;
  @Input() isOpen: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  initials = computed(() => {
    const employee = this.employee;
    if (!employee || !employee.name) return '';
    return employee.name
      .split(' ')
      .map((n) => n[0])
      .join('');
  });

  onClose() {
    this.closeModal.emit();
  }
  onConfirm() {
    this.confirm.emit();
  }
}
