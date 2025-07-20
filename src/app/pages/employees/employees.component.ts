import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { DeleteConfirmModalComponent } from '../../shared/components/delete-confirm-modal/delete-confirm-modal.component';
import { Employee } from '../../shared/models/app.types';
import {
  Plus,
  LucideAngularModule,
  Funnel,
  Search,
  UsersRound,
  SquarePen,
  Trash2,
  Mail,
  UserRound,
  Eye,
  X,
  Info,
  TriangleAlert,
} from 'lucide-angular';
import { EmployeeService } from '../../shared/services/employee.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DeleteConfirmModalComponent,
    LucideAngularModule,
  ],
  templateUrl: './employees.component.html',
})
export class EmployeesComponent implements OnInit {
  readonly Plus = Plus;
  readonly Funnel = Funnel;
  readonly Search = Search;
  readonly UsersRound = UsersRound;
  readonly SquarePen = SquarePen;
  readonly Trash2 = Trash2;
  readonly Mail = Mail;
  readonly UserRound = UserRound;
  readonly Eye = Eye;
  readonly Info = Info;
  readonly X = X;
  readonly TriangleAlert = TriangleAlert;

  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);

  // --- STATE MANAGEMENT ---
  private allEmployees$ = this.employeeService.getEmployees();
  public allEmployees = toSignal(this.allEmployees$, { initialValue: [] });

  filterForm = this.fb.group({
    search: [''],
    position: [''],
    level: [''],
    supervisor: [''],
    hasTeammates: [''],
    hasSubordinates: [''],
  });
  filtersSignal = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.value))
  );
  employeeForm = this.fb.group({
    id: [null as string | null],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    department: ['Technology'],
    position: ['Frontend Developer', Validators.required],
    level: ['junior', Validators.required],
    supervisor: [null as string | null],
    teammates: this.fb.array([]),
    subordinates: this.fb.array([]),
  });

  // --- DERIVED DATA (COMPUTED SIGNALS) ---
  employeesMap = computed(
    () => new Map(this.allEmployees().map((e) => [e.id, e]))
  );
  filteredEmployees = computed(() => {
    const employees = this.allEmployees();
    const f = this.filtersSignal();
    if (!f) return employees;
    const searchTerm = f.search?.toLowerCase() || '';
    return employees.filter((e) => {
      const matchesSearch = searchTerm
        ? e.name.toLowerCase().includes(searchTerm) ||
          e.email.toLowerCase().includes(searchTerm)
        : true;
      const matchesPosition = f.position ? e.position === f.position : true;
      const matchesLevel = f.level ? e.level === f.level : true;
      const matchesSupervisor = f.supervisor
        ? f.supervisor === 'none'
          ? !e.supervisor
          : e.supervisor === f.supervisor
        : true;
      const matchesTeammates = f.hasTeammates
        ? f.hasTeammates === 'yes'
          ? e.teammates.length > 0
          : e.teammates.length === 0
        : true;
      const matchesSubordinates = f.hasSubordinates
        ? f.hasSubordinates === 'yes'
          ? e.subordinates.length > 0
          : e.subordinates.length === 0
        : true;
      return (
        matchesSearch &&
        matchesPosition &&
        matchesLevel &&
        matchesSupervisor &&
        matchesTeammates &&
        matchesSubordinates
      );
    });
  });
  positions = computed(() => [
    'Frontend Developer',
    'Backend Developer',
    'DevOps Engineer',
  ]);
  levels = computed(() => ['senior', 'junior']);
  supervisors = computed(() =>
    this.allEmployees()
      .filter((e) => e.subordinates.length > 0)
      .map((e) => ({ id: e.id, name: e.name }))
  );
  hasActiveFilters = computed(() => {
    const f = this.filtersSignal();
    if (!f) return false;
    // Check if any filter value is present and not an empty string
    return Object.values(f).some((value) => value !== null && value !== '');
  });
  availableEmployees = computed(() => {
    const f = this.filtersAvailableEmployees();
    if (!f) return [];
    const position = f.position;
    const level = f.level;
    return this.allEmployees().filter(
      (e) => e.id !== this.selectedEmployee()?.id && e.level === level
    );
  });
  availableSupervisors = computed(() => {
    const f = this.filtersAvailableEmployees();
    if (!f) return [];
    const level = f.level;
    const position = f.position;
    return this.allEmployees().filter(
      (e) =>
        e.id !== this.selectedEmployee()?.id &&
        e.position === position &&
        e.level === 'senior' &&
        level === 'junior'
    );
  });
  availableJunior = computed(() => {
    const f = this.filtersAvailableEmployees();
    if (!f) return [];
    const level = f.level;
    const position = f.position;
    return this.allEmployees().filter(
      (e) =>
        e.id !== this.selectedEmployee()?.id &&
        e.position === position &&
        e.level === 'junior' &&
        level === 'senior'
    );
  });
  filtersAvailableEmployees = toSignal(
    this.employeeForm.valueChanges.pipe(startWith(this.employeeForm.value))
  );

  // --- MODAL STATE ---
  isDeleteModalOpen = signal(false);
  employeeToDelete = signal<Employee | null>(null);
  isFormModalOpen = signal(false);
  formMode = signal<'create' | 'edit' | 'view'>('view');
  selectedEmployee = signal<Employee | null>(null);

  ngOnInit(): void {
    const levelControl = this.employeeForm.get('level');
    const positionControl = this.employeeForm.get('position');

    if (levelControl) {
      levelControl.valueChanges
        .pipe(startWith(levelControl.value))
        .subscribe((levelValue) => {
          if (levelValue) {
            this.employeeForm.get('supervisor')?.setValue(null);
            this.setFormArray('teammates', []);
            this.setFormArray('subordinates', []);
          }
        });
    }
    if (positionControl) {
      positionControl.valueChanges
        .pipe(startWith(positionControl.value))
        .subscribe((positionValue) => {
          if (positionValue) {
            this.employeeForm.get('supervisor')?.setValue(null);
            this.setFormArray('teammates', []);
            this.setFormArray('subordinates', []);
          }
        });
    }
  }

  // --- ACTION HANDLERS ---
  isIdChecked(controlName: 'teammates' | 'subordinates', id: string): boolean {
    const formArray = this.employeeForm.get(controlName) as FormArray;
    return formArray.value.includes(id);
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

  onRemoveFilter(controlName: string) {
    this.filterForm.get(controlName)?.setValue('');
  }

  getSupervisorName(id: string | undefined | null) {
    return this.supervisors().find((s) => s.id === id)?.name;
  }

  getNamesByIds(ids: string[]): string[] {
    const map = this.employeesMap();
    return ids
      .map((id) => map.get(id)?.name)
      .filter((name): name is string => !!name);
  }

  initials(employeeName: string | undefined): string {
    if (!employeeName) return '';
    return employeeName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  levelBadgeColor(employeeLevel: string): string {
    return employeeLevel === 'senior'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800';
  }

  onAddEmployee() {
    this.formMode.set('create');
    this.selectedEmployee.set(null);
    this.isFormModalOpen.set(true);
    this.employeeForm.reset();
    this.employeeForm.patchValue({
      department: 'Technology',
      position: 'Frontend Developer',
      level: 'junior',
    });
    this.setFormArray('teammates', []);
    this.setFormArray('subordinates', []);
  }

  private setFormArray(
    controlName: 'teammates' | 'subordinates',
    ids: string[]
  ) {
    const formArray = this.employeeForm.get(controlName) as FormArray;
    formArray.clear();
    ids.forEach((id) => formArray.push(new FormControl(id)));
  }

  onViewEmployee(employee: Employee) {
    this.formMode.set('view');
    this.selectedEmployee.set(employee);
    this.isFormModalOpen.set(true);
    this.employeeForm.reset();
    this.employeeForm.disable();
    const selected = this.selectedEmployee();
    if (selected) {
      this.employeeForm
        .get('level')
        ?.setValue(selected.level, { emitEvent: true });
      this.employeeForm
        .get('position')
        ?.setValue(selected.position, { emitEvent: true });

      setTimeout(() => {
        this.employeeForm.patchValue({
          id: selected.id,
          name: selected.name,
          email: selected.email,
          department: selected.department,
          supervisor: selected.supervisor || null,
        });

        this.setFormArray('teammates', selected.teammates);
        this.setFormArray('subordinates', selected.subordinates);
      }, 500);
    }
  }

  onEditEmployee(employee: Employee) {
    this.formMode.set('edit');
    this.selectedEmployee.set(employee);
    this.isFormModalOpen.set(true);
    this.employeeForm.reset();
    const selected = this.selectedEmployee();
    if (selected) {
      this.employeeForm
        .get('level')
        ?.setValue(selected.level, { emitEvent: true });
      this.employeeForm
        .get('position')
        ?.setValue(selected.position, { emitEvent: true });

      setTimeout(() => {
        this.employeeForm.patchValue({
          id: selected.id,
          name: selected.name,
          email: selected.email,
          department: selected.department,
          supervisor: selected.supervisor || null,
        });

        this.setFormArray('teammates', selected.teammates);
        this.setFormArray('subordinates', selected.subordinates);
      }, 500);
    }
    this.employeeForm.enable();
    this.employeeForm.get('department')?.disable();
  }

  onDeleteEmployee(employee: Employee) {
    this.employeeToDelete.set(employee);
    this.isDeleteModalOpen.set(true);
  }

  onClearFilters() {
    this.filterForm.reset({
      search: '',
      position: '',
      level: '',
      supervisor: '',
      hasTeammates: '',
      hasSubordinates: '',
    });
  }

  onDeleteModalClose() {
    this.isDeleteModalOpen.set(false);
    this.employeeToDelete.set(null);
  }

  async onDeleteModalConfirm() {
    const employee = this.employeeToDelete();
    if (employee) {
      try {
        await this.employeeService.deleteEmployee(employee.id);
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
    this.onDeleteModalClose();
  }

  onFormModalClose() {
    this.isFormModalOpen.set(false);
    this.selectedEmployee.set(null);
  }

  async onSaveEmployee() {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }
    const employeeData = this.employeeForm.getRawValue();
    try {
      const dataToSave = {
        name: employeeData.name!,
        email: employeeData.email!,
        position: employeeData.position!,
        department: employeeData.department!,
        status: 'Active',
        level: employeeData.level as 'senior' | 'junior',
        supervisor: (employeeData.supervisor || '') as string,
        teammates: (employeeData.teammates as string[]) || [],
        subordinates: (employeeData.subordinates as string[]) || [],
      };
      if (this.formMode() === 'create') {
        await this.employeeService.addEmployee(dataToSave);
      } else if (this.formMode() === 'edit' && this.selectedEmployee()) {
        const employeeId = this.selectedEmployee()!.id;
        console.log(dataToSave);

        await this.employeeService.updateEmployee(employeeId, dataToSave);
      }
    } catch (error) {
      console.error('Error saving employee:', error);
    }
    this.onFormModalClose();
  }
}
