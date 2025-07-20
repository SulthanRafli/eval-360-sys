import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
  computed,
  Signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormArray,
  FormControl,
  FormsModule,
} from '@angular/forms';
import { Employee } from '../../../../shared/models/app.types';
import { Info, LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'app-employee-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    FormsModule,
  ],
  templateUrl: './employee-form-modal.component.html',
})
export class EmployeeFormModalComponent implements OnChanges {
  readonly X = X;
  readonly Info = Info;

  @Input() isOpen: boolean = false;
  @Input() mode: 'create' | 'edit' | 'view' = 'view';
  @Input() employee: Employee | null = null;
  @Input({ required: true }) allEmployees!: Signal<Employee[]>;

  @Output() closeModal = new EventEmitter<void>();
  @Output() save = new EventEmitter<Partial<Employee>>();

  private fb = inject(FormBuilder);
  employeeForm: FormGroup;
  // Static data for dropdowns
  positions = [
    'Frontend Developer',
    'Backend Developer',
    'DevOps Engineer',
    'Project Manager',
    'UI/UX Designer',
    'QA Engineer',
  ];
  levels = ['senior', 'junior'];

  // Derived data for relationship dropdowns
  availableEmployees = computed(() =>
    this.allEmployees().filter((e) => e.id !== this.employee?.id)
  );
  availableSupervisors = computed(() =>
    this.availableEmployees().filter((e) => e.level === 'senior')
  );

  constructor() {
    this.employeeForm = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      department: ['Technology'],
      position: ['Frontend Developer', Validators.required],
      level: ['junior', Validators.required],
      supervisor: [null],
      teammates: this.fb.array([]),
      subordinates: this.fb.array([]),
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.employeeForm.reset(); // Reset form on open
      if (this.mode === 'edit' || this.mode === 'view') {
        if (this.employee) {
          this.employeeForm.patchValue(this.employee);
          this.setFormArray('teammates', this.employee.teammates);
          this.setFormArray('subordinates', this.employee.subordinates);
        }
      } else {
        // create mode
        this.employeeForm.patchValue({
          department: 'Technology',
          position: 'Frontend Developer',
          level: 'junior',
        });
        this.setFormArray('teammates', []);
        this.setFormArray('subordinates', []);
      }

      if (this.mode === 'view') {
        this.employeeForm.disable();
      } else {
        this.employeeForm.enable();
        // The department field should always be disabled
        this.employeeForm.get('department')?.disable();
      }
    }
  }

  private setFormArray(
    controlName: 'teammates' | 'subordinates',
    ids: string[]
  ) {
    const formArray = this.employeeForm.get(controlName) as FormArray;
    formArray.clear();
    ids.forEach((id) => formArray.push(new FormControl(id)));
  }

  onCheckboxChange(event: Event, controlName: 'teammates' | 'subordinates') {
    const formArray = this.employeeForm.get(controlName) as FormArray;
    const target = event.target as HTMLInputElement;
    const id = target.value;

    if (target.checked) {
      formArray.push(new FormControl(id));
    } else {
      const index = formArray.controls.findIndex((x) => x.value === id);
      if (index !== -1) {
        formArray.removeAt(index);
      }
    }
  }

  isIdChecked(controlName: 'teammates' | 'subordinates', id: string): boolean {
    const formArray = this.employeeForm.get(controlName) as FormArray;
    return formArray.value.includes(id);
  }

  onSubmit() {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }
    this.save.emit(this.employeeForm.getRawValue());
  }

  onClose() {
    this.closeModal.emit();
  }
}
