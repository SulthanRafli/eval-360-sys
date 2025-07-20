import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { DeleteConfirmModalComponent } from '../../shared/components/delete-confirm-modal/delete-confirm-modal.component';
import { EmployeeCardComponent } from './components/employee-card/employee-card.component';
import { EmployeeFiltersComponent } from './components/employee-filters/employee-filters.component';
import { EmployeeFormModalComponent } from './components/employee-form-modal/employee-form-modal.component';
import { Employee } from '../../shared/models/app.types';
import { mockEmployees } from '../../shared/data/mock-data';
import { Plus, LucideAngularModule, Funnel, Search } from 'lucide-angular';
import { EmployeeService } from '../../shared/services/employee.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DeleteConfirmModalComponent,
    EmployeeCardComponent,
    EmployeeFiltersComponent,
    EmployeeFormModalComponent,
    LucideAngularModule,
  ],
  templateUrl: './employees.component.html',
})
export class EmployeesComponent {
  readonly Plus = Plus;
  readonly Funnel = Funnel;
  readonly Search = Search;

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
    ...new Set(this.allEmployees().map((e) => e.position)),
  ]);
  levels = computed(() => [
    ...new Set(this.allEmployees().map((e) => e.level)),
  ]);
  supervisors = computed(() =>
    this.allEmployees()
      .filter((e) => e.subordinates.length > 0)
      .map((e) => ({ id: e.id, name: e.name }))
  );

  // --- MODAL STATE ---
  isDeleteModalOpen = signal(false);
  employeeToDelete = signal<Employee | null>(null);
  isFormModalOpen = signal(false);
  formMode = signal<'create' | 'edit' | 'view'>('view');
  selectedEmployee = signal<Employee | null>(null);

  // --- ACTION HANDLERS ---
  getNamesByIds(ids: string[]): string[] {
    const map = this.employeesMap();
    return ids
      .map((id) => map.get(id)?.name)
      .filter((name): name is string => !!name);
  }

  onAddEmployee() {
    this.formMode.set('create');
    this.selectedEmployee.set(null);
    this.isFormModalOpen.set(true);
  }

  onViewEmployee(employee: Employee) {
    this.formMode.set('view');
    this.selectedEmployee.set(employee);
    this.isFormModalOpen.set(true);
  }

  onEditEmployee(employee: Employee) {
    this.formMode.set('edit');
    this.selectedEmployee.set(employee);
    this.isFormModalOpen.set(true);
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

  async onSaveEmployee(employeeData: Partial<Employee>) {
    try {
      if (this.formMode() === 'create') {
        const newEmployee: Omit<Employee, 'id'> = {
          name: employeeData.name!,
          email: employeeData.email!,
          position: employeeData.position!,
          department: employeeData.department!,
          status: 'Active',
          level: employeeData.level!,
          supervisor: employeeData.supervisor,
          teammates: employeeData.teammates || [],
          subordinates: employeeData.subordinates || [],
        };
        await this.employeeService.addEmployee(newEmployee);
      } else if (this.formMode() === 'edit' && this.selectedEmployee()) {
        const employeeId = this.selectedEmployee()!.id;
        await this.employeeService.updateEmployee(employeeId, employeeData);
      }
    } catch (error) {
      console.error('Error saving employee:', error);
    }
    this.onFormModalClose();
  }
}
