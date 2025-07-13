import {
  Component,
  Input,
  Output,
  EventEmitter,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee } from '../../../../shared/models/app.types';

@Component({
  selector: 'app-employee-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-card.component.html',
})
export class EmployeeCardComponent {
  @Input({ required: true }) employee!: Employee;
  @Input() supervisorName?: string;
  @Input() teammateNames: string[] = [];
  @Input() subordinateNames: string[] = [];

  @Output() view = new EventEmitter<Employee>();
  @Output() edit = new EventEmitter<Employee>();
  @Output() delete = new EventEmitter<Employee>();

  initials = computed(() => {
    if (!this.employee.name) return '';
    return this.employee.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  });

  levelBadgeColor = computed(() => {
    return this.employee.level === 'senior'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800';
  });

  onViewClick() {
    this.view.emit(this.employee);
  }
  onEditClick() {
    this.edit.emit(this.employee);
  }
  onDeleteClick() {
    this.delete.emit(this.employee);
  }
}
