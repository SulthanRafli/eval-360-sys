import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  Evaluation,
  EvaluationFormData,
  EvaluationResponse,
  EvaluationStats,
} from '../../shared/models/app.types';
import { EvaluationService } from '../../shared/services/evaluation.service';
import { EmployeeService } from '../../shared/services/employee.service';
import {
  Award,
  CircleCheck,
  CircleMinus,
  ClipboardList,
  Clock4,
  ClockArrowUp,
  Eye,
  Info,
  LucideAngularModule,
  Search,
  SquarePen,
  Star,
  Target,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-angular';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CriteriaService } from '../../shared/services/criteria.service';
import { startWith, switchMap } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import { RecentActivitiesService } from '../../shared/services/recent-activities.service';
import { AuthService } from '../../shared/services/auth.service';
import moment from 'moment';

@Component({
  selector: 'app-evaluations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ReactiveFormsModule,
  ],
  templateUrl: './evaluations.component.html',
  styleUrls: ['./evaluations.component.css'],
})
export class EvaluationsComponent {
  readonly CircleMinus = CircleMinus;
  readonly CircleCheck = CircleCheck;
  readonly Clock4 = Clock4;
  readonly ClockArrowUp = ClockArrowUp;
  readonly Eye = Eye;
  readonly SquarePen = SquarePen;
  readonly Trash2 = Trash2;
  readonly TrendingUp = TrendingUp;
  readonly Award = Award;
  readonly Target = Target;
  readonly Search = Search;
  readonly Info = Info;
  readonly X = X;
  readonly ClipboardList = ClipboardList;
  readonly Users = Users;

  // Injected services
  private fb = inject(FormBuilder);
  private evaluationService = inject(EvaluationService);
  private employeeService = inject(EmployeeService);
  private criteriaService = inject(CriteriaService);
  private activitiesService = inject(RecentActivitiesService);
  private authService = inject(AuthService);

  // Signal-based state properties
  selectedEmployee = signal('');
  selectedType = signal('');
  selectedPeriod = signal(moment().format('YYYY-MM'));
  showEvaluationForm = signal(false);
  showEvaluationDetail = signal(false);
  showScaleModal = signal(false);
  currentEvaluation: EvaluationFormData | null = null;
  selectedEvaluationDetail = signal<Evaluation | null>(null);
  viewMode = signal<'matrix' | 'list' | 'stats'>('matrix');
  loading = signal(true);
  error = signal<string | null>(null);

  filterForm = this.fb.group({
    search: [''],
    status: [''],
    type: [''],
    evaluator: [''],
  });

  filterMatrixForm = this.fb.group({
    search: [''],
    position: [''],
    level: [''],
  });

  evaluationForm = this.fb.group({
    responses: this.fb.array([]),
    generalComment: [''],
  });

  public employees = toSignal(this.employeeService.getEmployees(), {
    initialValue: [],
  });
  public evaluations = toSignal(
    toObservable(this.selectedPeriod).pipe(
      switchMap((period) =>
        this.evaluationService.getEvaluationsByPeriod(period)
      )
    ),
    { initialValue: [] }
  );
  public allEvaluationCriteria = toSignal(this.criteriaService.getCriteria(), {
    initialValue: [],
  });
  public currentUser = this.authService.currentUserProfile();

  filtersSignal = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.value))
  );
  filtersMatrixSignal = toSignal(
    this.filterMatrixForm.valueChanges.pipe(
      startWith(this.filterMatrixForm.value)
    )
  );

  // Computed properties
  filteredEvaluations = computed(() => {
    const evaluationList = this.evaluations();
    const currentFilters = this.filtersSignal();
    const employeeList = this.employees();

    return evaluationList.filter((evaluation) => {
      const employee = employeeList.find((e) => e.id === evaluation.employeeId);
      const evaluator = employeeList.find(
        (e) => e.id === evaluation.evaluatorId
      );

      if (!currentFilters) return true;
      if (currentFilters.search) {
        const searchLower = currentFilters.search.toLowerCase();
        const matchesEmployee = employee?.name
          .toLowerCase()
          .includes(searchLower);
        const matchesEvaluator = evaluator?.name
          .toLowerCase()
          .includes(searchLower);
        if (!matchesEmployee && !matchesEvaluator) return false;
      }

      if (currentFilters.status && evaluation.status !== currentFilters.status)
        return false;
      if (currentFilters.type && evaluation.type !== currentFilters.type)
        return false;
      if (
        currentFilters.evaluator &&
        evaluation.evaluatorId !== currentFilters.evaluator
      )
        return false;

      return true;
    });
  });
  filteredEmployees = computed(() => {
    const employees = this.employees();
    const f = this.filtersMatrixSignal();
    if (!f) return employees;
    const searchTerm = f.search?.toLowerCase() || '';
    return employees.filter((e) => {
      const matchesSearch = searchTerm
        ? e.name.toLowerCase().includes(searchTerm) ||
          e.email.toLowerCase().includes(searchTerm)
        : true;
      const matchesPosition = f.position ? e.position === f.position : true;
      const matchesLevel = f.level ? e.level === f.level : true;
      return matchesSearch && matchesPosition && matchesLevel;
    });
  });
  stats = computed((): EvaluationStats => {
    const all = this.evaluations();
    const evaluationList = all.filter((val) => {
      if (this.currentUser?.level === 'admin') {
        return val.employeeId !== this.currentUser?.id;
      } else {
        return val.employeeId === this.currentUser?.id;
      }
    });
    const total = evaluationList.length;
    const completed = evaluationList.filter(
      (e) => e.status === 'completed'
    ).length;
    const pending = evaluationList.filter((e) => e.status === 'pending').length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    const defaultStats: EvaluationStats = {
      total,
      completed,
      pending,
      completionRate,
      totalOfAverages: 0,
    };

    const allResponses = evaluationList.flatMap((e) => e.responses);
    if (allResponses.length === 0) return defaultStats;
    const criteriaAggregates = new Map<
      string,
      { totalScore: number; count: number }
    >();
    allResponses.forEach((response) => {
      const { criteriaId, score } = response;
      const current = criteriaAggregates.get(criteriaId) || {
        totalScore: 0,
        count: 0,
      };
      current.totalScore += score;
      current.count++;
      criteriaAggregates.set(criteriaId, current);
    });

    // --- Calculate final averages ---
    const averageScorePerCriteria: { [criteriaId: string]: number } = {};
    let totalOfAverages = 0;
    for (const [criteriaId, aggregate] of criteriaAggregates.entries()) {
      const avg =
        aggregate.count > 0 ? aggregate.totalScore / aggregate.count : 0;
      averageScorePerCriteria[criteriaId] = avg;
      totalOfAverages += avg;
    }

    const totalScore = allResponses.reduce((sum, r) => sum + r.score, 0);
    const averageScore = totalScore / allResponses.length;

    return {
      total,
      completed,
      pending,
      completionRate,
      totalOfAverages: averageScore,
    };
  });
  positions = computed(() => [
    'Frontend Developer',
    'Backend Developer',
    'DevOps Engineer',
  ]);
  levels = computed(() => ['senior', 'junior']);
  evaluatableEmployees = computed(() => {
    const all = this.employees();
    const user = all.find((val) => {
      if (this.currentUser?.level === 'admin') {
        return null;
      } else {
        return val.id === this.currentUser?.id;
      }
    });
    const type = this.selectedType();

    if (!user || !type) return [];

    switch (type) {
      case 'supervisor':
        return user.supervisor
          ? all.filter((e) => e.id === user.supervisor)
          : [];
      case 'peer':
        return all.filter((e) => user.teammates.includes(e.id));
      case 'subordinate':
        return all.filter((e) => user.subordinates.includes(e.id));
      case 'self':
        return [user];
      default:
        return [];
    }
  });
  getAnsweredQuestionsCount = computed(() => {
    if (!this.currentEvaluation) return 0;
    return Object.values(this.currentEvaluation.responses).filter(
      (r) => r.score > 0
    ).length;
  });
  getTotalQuestionsCount = computed(() => {
    return this.allEvaluationCriteria().reduce(
      (sum, criteria) => sum + criteria.questions.length,
      0
    );
  });
  getRatingConfig = computed(() => {
    const average = this.stats().totalOfAverages || 0;

    const ratings = [
      {
        label: 'Sangat Baik',
        class: 'bg-green-100 text-green-800',
        minValue: 4.2,
      },
      {
        label: 'Baik',
        class: 'bg-blue-100 text-blue-800',
        minValue: 3.4,
        maxValue: 4.2,
      },
      {
        label: 'Cukup',
        class: 'bg-yellow-100 text-yellow-800',
        minValue: 2.6,
        maxValue: 3.4,
      },
      {
        label: 'Buruk',
        class: 'bg-orange-100 text-orange-800',
        minValue: 1.8,
        maxValue: 2.6,
      },
      {
        label: 'Sangat Buruk',
        class: 'bg-red-100 text-red-800',
        minValue: 1.0,
        maxValue: 1.8,
      },
      {
        label: '-',
        class: 'bg-gray-100 text-gray-800',
        minValue: 0,
        maxValue: 1.0,
      },
    ];

    return (
      ratings.find(
        (rating) =>
          average >= rating.minValue &&
          (rating.maxValue === undefined || average < rating.maxValue)
      ) || ratings[ratings.length - 1]
    );
  });

  // Static data
  readonly allScaleLabels: { [key: number]: string } = {
    1: 'SK - Sangat Kurang',
    2: 'K - Kurang',
    3: 'C - Cukup',
    4: 'B - Baik',
    5: 'SB - Sangat Baik',
  };
  readonly periods = ['2024-Q1', '2023-Q4', '2023-Q3', '2023-Q2'];
  readonly evaluationTypes = [
    { value: 'supervisor', label: 'Atasan', icon: User, color: 'blue' },
    { value: 'peer', label: 'Sejawat', icon: Users, color: 'green' },
    {
      value: 'subordinate',
      label: 'Bawahan',
      icon: UserCheck,
      color: 'purple',
    },
    { value: 'self', label: 'Diri Sendiri', icon: Star, color: 'yellow' },
  ];

  async generateEvalFuationsForPeriod(): Promise<void> {
    const employees = this.employees();
    const period = this.selectedPeriod();

    if (employees.length === 0) {
      return;
    }

    try {
      this.loading.set(true);
      await this.evaluationService.generatePendingEvaluations(
        period,
        employees
      );
    } catch (error) {
      console.error('Error generating evaluations:', error);
      this.error.set('Failed to generate evaluations');
    } finally {
      this.loading.set(false);
    }
  }

  onSelectedTypeChange(value: string): void {
    this.selectedEmployee.set('');
    if (value === 'self') {
      this.selectedEmployee.set('0gpoWVJXNEkvUAe6eQed');
    }
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: '',
      type: '',
      evaluator: '',
    });
  }
  clearMatrixFilters(): void {
    this.filterMatrixForm.reset({
      search: '',
      position: '',
      level: '',
    });
  }

  startEvaluation(employeeId: string, evaluationType: string): void {
    if (!this.currentUser) {
      return;
    }

    const formData: EvaluationFormData = {
      evaluatorId: this.currentUser.id,
      employeeId,
      type: evaluationType as any,
      period: this.selectedPeriod(),
      responses: {},
      generalComment: '',
    };

    this.allEvaluationCriteria().forEach((criteria) => {
      criteria.questions.forEach((question) => {
        formData.responses[question.id] = {
          criteriaId: criteria.id,
          score: 0,
          comment: '',
        };
      });
    });

    this.currentEvaluation = formData;
    this.showEvaluationForm.set(true);
  }

  handleResponseChange(
    questionId: string,
    criteriaId: string,
    score: number,
    comment: string = ''
  ): void {
    const evaluation = this.currentEvaluation;
    if (!evaluation) return;

    const updatedEvaluation = {
      ...evaluation,
      responses: {
        ...evaluation.responses,
        [questionId]: {
          criteriaId,
          score,
          comment,
        },
      },
    };

    this.currentEvaluation = updatedEvaluation;
  }

  async submitEvaluation(): Promise<void> {
    const evaluation = this.currentEvaluation;
    if (!evaluation) return;

    try {
      const responses: EvaluationResponse[] = Object.entries(
        evaluation.responses
      ).map(([questionId, data]) => ({
        questionId,
        criteriaId: data.criteriaId,
        score: data.score,
        comment: data.comment || '',
      }));

      const employee = this.employees().find(
        (val) => val.id === evaluation.employeeId
      );
      const existingEval = this.evaluations().find(
        (e) =>
          e.employeeId === evaluation.employeeId &&
          e.evaluatorId === evaluation.evaluatorId &&
          e.type === evaluation.type &&
          e.period === evaluation.period
      );

      if (existingEval) {
        const updateData: Partial<Evaluation> = {
          status: 'completed',
          responses,
          comments: evaluation.generalComment || '',
          submittedAt: Timestamp.fromDate(new Date()),
        };
        await this.evaluationService.updateEvaluation(
          existingEval.id,
          updateData
        );
        await this.activitiesService.addActivity(
          `Evaluasi 360° untuk ${employee?.name} telah selesai`,
          this.authService.currentUserProfile()?.name || 'Sistem',
          'CircleCheck',
          'green'
        );
      } else {
        const newEvaluation: Omit<Evaluation, 'id'> = {
          evaluatorId: evaluation.evaluatorId,
          employeeId: evaluation.employeeId,
          type: evaluation.type,
          period: evaluation.period,
          status: 'completed',
          responses,
          comments: evaluation.generalComment || '',
          submittedAt: Timestamp.fromDate(new Date()),
        };
        await this.evaluationService.addEvaluation(newEvaluation);
        await this.activitiesService.addActivity(
          `Evaluasi 360° untuk ${employee?.name} telah selesai`,
          this.authService.currentUserProfile()?.name || 'Sistem',
          'CircleCheck',
          'green'
        );
      }

      this.showEvaluationForm.set(false);
      this.currentEvaluation = null;
    } catch (error) {
      console.error(error);
    }
  }

  async saveDraft(): Promise<void> {
    const evaluation = this.currentEvaluation;
    if (!evaluation) return;

    try {
      const responses: EvaluationResponse[] = Object.entries(
        evaluation.responses
      )
        .filter(([_, data]) => data.score > 0)
        .map(([questionId, data]) => ({
          questionId,
          criteriaId: data.criteriaId,
          score: data.score,
          comment: data.comment || '',
        }));

      const existingEval = this.evaluations().find(
        (e) =>
          e.employeeId === evaluation.employeeId &&
          e.evaluatorId === evaluation.evaluatorId &&
          e.type === evaluation.type &&
          e.period === evaluation.period
      );

      if (existingEval) {
        const updateData: Partial<Evaluation> = {
          status: 'pending',
          responses,
          comments: evaluation.generalComment || '',
        };
        await this.evaluationService.updateEvaluation(
          existingEval.id,
          updateData
        );
      } else {
        const newEvaluation: Omit<Evaluation, 'id'> = {
          evaluatorId: evaluation.evaluatorId,
          employeeId: evaluation.employeeId,
          type: evaluation.type,
          period: evaluation.period,
          status: 'pending',
          responses,
          comments: evaluation.generalComment || '',
        };
        await this.evaluationService.addEvaluation(newEvaluation);
      }

      this.showEvaluationForm.set(false);
      this.currentEvaluation = null;
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }

  viewEvaluationDetail(employeeId: string): void {
    const evaluation =
      this.evaluations().find((e) => e.employeeId === employeeId) || null;
    this.selectedEvaluationDetail.set(evaluation);
    this.showEvaluationDetail.set(true);
  }

  async deleteEvaluation(evaluationId: string): Promise<void> {
    if (confirm('Apakah Anda yakin ingin menghapus evaluasi ini?')) {
      try {
        await this.evaluationService.deleteEvaluation(evaluationId);
      } catch (error) {
        console.error('Error deleting evaluation:', error);
      }
    }
  }

  getEmployeeName(id: string): string {
    return this.employees().find((e) => e.id === id)?.name || 'Unknown';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed':
        return 'Selesai';
      case 'pending':
        return 'Menunggu';
      default:
        return status;
    }
  }

  getTypeConfig(type: string) {
    return this.evaluationTypes.find((t) => t.value === type);
  }

  getEvaluationProgress(employeeId: string): number {
    const evaluationList = this.evaluations();

    const employee = this.employees().find((e) => e.id === employeeId);
    if (!employee) {
      return 0;
    }

    const totalRequired =
      1 +
      (employee.teammates?.length || 0) +
      (employee.subordinates?.length || 0);

    let completedCount = 0;

    if (
      evaluationList.some(
        (e) =>
          e.employeeId === employeeId &&
          e.type === 'self' &&
          e.status === 'completed'
      )
    ) {
      completedCount++;
    }

    const completedPeerEvaluatorIds = new Set(
      evaluationList
        .filter(
          (e) =>
            e.employeeId === employeeId &&
            e.type === 'peer' &&
            e.status === 'completed'
        )
        .map((e) => e.evaluatorId)
    );

    (employee.teammates || []).forEach((teammateId) => {
      if (completedPeerEvaluatorIds.has(teammateId)) {
        completedCount++;
      }
    });

    const completedSubordinateEvaluatorIds = new Set(
      evaluationList
        .filter(
          (e) =>
            e.employeeId === employeeId &&
            e.type === 'subordinate' &&
            e.status === 'completed'
        )
        .map((e) => e.evaluatorId)
    );

    (employee.subordinates || []).forEach((subordinateId) => {
      if (completedSubordinateEvaluatorIds.has(subordinateId)) {
        completedCount++;
      }
    });

    return totalRequired > 0 ? (completedCount / totalRequired) * 100 : 100;
  }

  getEvaluationStatusForType(employeeId: string, type: string): string {
    const employee = this.employees().find((e) => e.id === employeeId);
    if (!employee) return 'none';

    let totalRequired = 0;
    switch (type) {
      case 'self':
        totalRequired = 1;
        break;
      case 'supervisor':
        totalRequired = employee.supervisor ? 1 : 0;
        break;
      case 'peer':
        totalRequired = employee.teammates?.length || 0;
        break;
      case 'subordinate':
        totalRequired = employee.subordinates?.length || 0;
        break;
    }

    if (totalRequired === 0) return 'none';

    const relevantEvals = this.evaluations().filter((e) => {
      if (type === 'supervisor') {
        return e.employeeId === employeeId && e.type === 'subordinate';
      } else if (type === 'subordinate') {
        return e.employeeId === employeeId && e.type === 'supervisor';
      } else {
        return e.employeeId === employeeId && e.type === type;
      }
    });

    const completedCount = relevantEvals.filter(
      (e) => e.status === 'completed'
    ).length;

    if (completedCount === totalRequired) return 'completed';
    const hasStarted = relevantEvals.some(
      (e) => e.status === 'pending' || e.status === 'completed'
    );
    if (hasStarted) return 'in-progress';

    return 'none';
  }

  getEvaluationForDetail(questionId: string): EvaluationResponse | undefined {
    const detail = this.selectedEvaluationDetail();
    return detail?.responses.find((r) => r.questionId === questionId);
  }

  getAverageScoreForCriteria(criteriaId: string): number {
    const detail = this.selectedEvaluationDetail();
    if (!detail) return 0;

    const criteria = this.allEvaluationCriteria().find(
      (c) => c.id === criteriaId
    );
    if (!criteria) return 0;

    const questionIds = new Set(criteria.questions.map((q) => q.id));
    const relevantResponses = detail.responses.filter((r) =>
      questionIds.has(r.questionId)
    );

    if (relevantResponses.length === 0) return 0;
    const totalScore = relevantResponses.reduce((sum, r) => sum + r.score, 0);
    return totalScore / relevantResponses.length;
  }

  getCompletedCount(type: string): number {
    const employee = this.employees().find((e) => {
      if (this.currentUser?.level === 'admin') {
        return null;
      } else {
        return e.id === this.currentUser?.id;
      }
    });
    let totalRequired = 0;
    if (!employee) {
      switch (type) {
        case 'self':
          totalRequired = this.employees().length;
          break;
        case 'supervisor':
          totalRequired = this.employees().reduce(
            (sum, val) => sum + (val?.supervisor ? 1 : 0),
            0
          );
          break;
        case 'peer':
          totalRequired = this.employees().reduce(
            (sum, val) => sum + (val?.teammates?.length || 0),
            0
          );
          break;
        case 'subordinate':
          totalRequired = this.employees().reduce(
            (sum, val) => sum + (val?.subordinates?.length || 0),
            0
          );
          break;
      }
    } else {
      switch (type) {
        case 'self':
          totalRequired = 1;
          break;
        case 'supervisor':
          totalRequired = employee?.supervisor ? 1 : 0;
          break;
        case 'peer':
          totalRequired = employee?.teammates?.length || 0;
          break;
        case 'subordinate':
          totalRequired = employee?.subordinates?.length || 0;
          break;
      }
    }

    if (totalRequired === 0) return 0;

    let relevantEvals = this.evaluations().filter((e) => {
      if (type === 'supervisor') {
        return e.type === 'subordinate';
      } else if (type === 'subordinate') {
        return e.type === 'supervisor';
      } else {
        return e.type === type;
      }
    });

    if (this.currentUser?.id) {
      relevantEvals = relevantEvals.filter((e) => {
        return e.employeeId == this.currentUser?.id;
      });
    }

    const completedCount = relevantEvals.filter(
      (e) => e.status === 'completed'
    ).length;

    return completedCount;
  }

  getTotalCount(type: string): number {
    const employee = this.employees().find((e) => {
      if (this.currentUser?.level === 'admin') {
        return null;
      } else {
        return e.id === this.currentUser?.id;
      }
    });
    let totalRequired = 0;
    if (!employee) {
      switch (type) {
        case 'self':
          totalRequired = this.employees().length;
          break;
        case 'supervisor':
          totalRequired = this.employees().reduce(
            (sum, val) => sum + (val?.supervisor ? 1 : 0),
            0
          );
          break;
        case 'peer':
          totalRequired = this.employees().reduce(
            (sum, val) => sum + (val?.teammates?.length || 0),
            0
          );
          break;
        case 'subordinate':
          totalRequired = this.employees().reduce(
            (sum, val) => sum + (val?.subordinates?.length || 0),
            0
          );
          break;
      }
    } else {
      switch (type) {
        case 'self':
          totalRequired = 1;
          break;
        case 'supervisor':
          totalRequired = employee?.supervisor ? 1 : 0;
          break;
        case 'peer':
          totalRequired = employee?.teammates?.length || 0;
          break;
        case 'subordinate':
          totalRequired = employee?.subordinates?.length || 0;
          break;
      }
    }

    return totalRequired;
  }

  getAveragePerCriteria(criteriaId: string) {
    if (!this.currentEvaluation) return 0;
    const criteria = this.allEvaluationCriteria().find(
      (val) => val.id === criteriaId
    );
    return (
      Object.values(this.currentEvaluation.responses)
        .filter((r) => r.criteriaId === criteriaId)
        .reduce((sum, val) => sum + val.score, 0) /
      (criteria?.questions.length || 1)
    );
  }

  initials(name: string): string {
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  }
}
