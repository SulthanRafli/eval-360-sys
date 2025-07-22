import { Component, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, Subscription } from 'rxjs';
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
  EyeClosed,
} from 'lucide-angular';
import { EmployeeService } from '../../shared/services/employee.service';
import { AuthService } from '../../shared/services/auth.service';
import { RecentActivitiesService } from '../../shared/services/recent-activities.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './employees.component.html',
})
export class EmployeesComponent implements OnDestroy {
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
  readonly EyeClosed = EyeClosed;

  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);
  private activitiesService = inject(RecentActivitiesService);
  private authService = inject(AuthService);
  private subscriptions = new Subscription();

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
    password: [''],
    department: ['Technology'],
    position: ['Frontend Developer', Validators.required],
    level: ['junior', Validators.required],
    supervisor: [null as string | null],
    teammates: this.fb.array([]),
    subordinates: this.fb.array([]),
  });

  // --- FLAGS FOR FORM STATE ---
  private isFormBeingPopulated = signal(false);

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
    return Object.values(f).some((value) => value !== null && value !== '');
  });

  availableEmployees = computed(() => {
    const f = this.filtersAvailableEmployees();
    if (!f) return [];
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
  showPassword = signal(false);

  ngOnInit(): void {
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private setupFormSubscriptions(): void {
    const levelControl = this.employeeForm.get('level');
    const positionControl = this.employeeForm.get('position');

    if (levelControl) {
      const levelSub = levelControl.valueChanges
        .pipe(startWith(levelControl.value))
        .subscribe((levelValue) => {
          if (
            levelValue &&
            !this.isFormBeingPopulated() &&
            this.formMode() === 'create'
          ) {
            this.employeeForm
              .get('supervisor')
              ?.setValue(null, { emitEvent: false });
            this.setFormArray('teammates', []);
            this.setFormArray('subordinates', []);
          }
        });
      this.subscriptions.add(levelSub);
    }

    if (positionControl) {
      const positionSub = positionControl.valueChanges
        .pipe(startWith(positionControl.value))
        .subscribe((positionValue) => {
          if (
            positionValue &&
            !this.isFormBeingPopulated() &&
            this.formMode() === 'create'
          ) {
            this.employeeForm
              .get('supervisor')
              ?.setValue(null, { emitEvent: false });
            this.setFormArray('teammates', []);
            this.setFormArray('subordinates', []);
          }
        });
      this.subscriptions.add(positionSub);
    }
  }

  // --- UTILITY METHODS ---
  private setFormArray(
    controlName: 'teammates' | 'subordinates',
    ids: string[]
  ): void {
    const formArray = this.employeeForm.get(controlName) as FormArray;
    formArray.clear();
    ids.forEach((id) => formArray.push(new FormControl(id)));
  }

  toggleShowPassword() {
    this.showPassword.update((value) => !value);
  }

  private populateEmployeeForm(employee: Employee): void {
    this.isFormBeingPopulated.set(true);
    this.employeeForm.reset();
    this.employeeForm.patchValue(
      {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        password: employee.password,
        department: employee.department,
        position: employee.position,
        level: employee.level,
        supervisor: employee.supervisor || null,
      },
      { emitEvent: false }
    );
    this.setFormArray('teammates', employee.teammates);
    this.setFormArray('subordinates', employee.subordinates);
    this.isFormBeingPopulated.set(false);
  }

  // --- ACTION HANDLERS ---
  isIdChecked(controlName: 'teammates' | 'subordinates', id: string): boolean {
    const formArray = this.employeeForm.get(controlName) as FormArray;
    return formArray.value.includes(id);
  }

  onCheckboxChange(
    event: Event,
    controlName: 'teammates' | 'subordinates'
  ): void {
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

  onRemoveFilter(controlName: string): void {
    this.filterForm.get(controlName)?.setValue('');
  }

  getSupervisorName(id: string | undefined | null): string | undefined {
    return this.supervisors().find((s) => s.id === id)?.name;
  }

  getNamesByIds(ids: string[]): string[] {
    const map = this.employeesMap();
    return ids
      .map((id) => map.get(id)?.name)
      .filter((name): name is string => !!name);
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

  levelBadgeColor(employeeLevel: string): string {
    return employeeLevel === 'senior'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800';
  }

  onAddEmployee(): void {
    this.formMode.set('create');
    this.selectedEmployee.set(null);
    this.isFormModalOpen.set(true);
    this.isFormBeingPopulated.set(true);
    this.showPassword.set(false);

    this.employeeForm.reset();
    this.employeeForm.patchValue({
      department: 'Technology',
      position: 'Frontend Developer',
      level: 'junior',
    });
    this.setFormArray('teammates', []);
    this.setFormArray('subordinates', []);

    this.isFormBeingPopulated.set(false);
  }

  onViewEmployee(employee: Employee): void {
    this.formMode.set('view');
    this.selectedEmployee.set(employee);
    this.isFormModalOpen.set(true);
    this.showPassword.set(true);

    this.populateEmployeeForm(employee);
    this.employeeForm.disable();
  }

  onEditEmployee(employee: Employee): void {
    this.formMode.set('edit');
    this.selectedEmployee.set(employee);
    this.isFormModalOpen.set(true);
    this.showPassword.set(false);

    this.populateEmployeeForm(employee);
    this.employeeForm.enable();
    this.employeeForm.get('department')?.disable();
  }

  onDeleteEmployee(employee: Employee): void {
    this.employeeToDelete.set(employee);
    this.isDeleteModalOpen.set(true);
  }

  onClearFilters(): void {
    this.filterForm.reset({
      search: '',
      position: '',
      level: '',
      supervisor: '',
      hasTeammates: '',
      hasSubordinates: '',
    });
  }

  onDeleteModalClose(): void {
    this.isDeleteModalOpen.set(false);
    this.employeeToDelete.set(null);
  }

  async onDeleteModalConfirm(): Promise<void> {
    const employee = this.employeeToDelete();
    if (employee) {
      try {
        await this.employeeService.deleteEmployee(employee.id);
        await this.activitiesService.addActivity(
          `Menghapus karyawan : ${employee.name}`,
          this.authService.currentUserProfile()?.name || 'Sistem',
          'Trash2',
          'red'
        );
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
    this.onDeleteModalClose();
  }

  onFormModalClose(): void {
    this.isFormModalOpen.set(false);
    this.selectedEmployee.set(null);
  }

  async onSaveEmployee(): Promise<void> {
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
        password: employeeData.password!,
        status: 'Active',
        level: employeeData.level as 'senior' | 'junior',
        supervisor: (employeeData.supervisor || '') as string,
        teammates: (employeeData.teammates as string[]) || [],
        subordinates: (employeeData.subordinates as string[]) || [],
      };

      if (this.formMode() === 'create') {
        await this.employeeService.addEmployee(dataToSave);
        await this.activitiesService.addActivity(
          `Menambahkan karyawan baru: ${employeeData.name}`,
          this.authService.currentUserProfile()?.name || 'Sistem',
          'UserPlus',
          'green'
        );
      } else if (this.formMode() === 'edit' && this.selectedEmployee()) {
        const employeeId = this.selectedEmployee()!.id;
        await this.employeeService.updateEmployee(employeeId, dataToSave);
        await this.activitiesService.addActivity(
          `Mengubah karyawan : ${employeeData.name}`,
          this.authService.currentUserProfile()?.name || 'Sistem',
          'SquarePen',
          'yellow'
        );
      }
    } catch (error) {
      console.error('Error saving employee:', error);
    }
    this.onFormModalClose();
  }
}
