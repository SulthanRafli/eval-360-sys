import {
  Component,
  Input,
  Output,
  EventEmitter,
  computed,
  Signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-filters.component.html',
})
export class EmployeeFiltersComponent {
  @Input({ required: true }) filterForm!: FormGroup;
  @Input({ required: true }) filters!: Signal<any>;
  @Input() positions: string[] = [];
  @Input() levels: ('senior' | 'junior')[] = [];
  @Input() supervisors: { id: string; name: string }[] = [];

  @Output() clearFilters = new EventEmitter<void>();

  hasActiveFilters = computed(() => {
    const f = this.filters();
    if (!f) return false;
    // Check if any filter value is present and not an empty string
    return Object.values(f).some((value) => value !== null && value !== '');
  });

  getSupervisorName(id: string) {
    return this.supervisors.find((s) => s.id === id)?.name;
  }

  onClearFilters() {
    this.clearFilters.emit();
  }

  onRemoveFilter(controlName: string) {
    this.filterForm.get(controlName)?.setValue('');
  }
}
