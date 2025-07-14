import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Evaluation, EvaluationResponse } from '../../shared/models/app.types';
import {
  evaluationCriteria,
  mockEmployees,
  scaleLabels,
} from '../../shared/data/mock-data';
import {
  Award,
  CircleCheck,
  CircleMinus,
  Clock4,
  ClockArrowUp,
  Eye,
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
} from 'lucide-angular';

// Interfaces
interface EvaluationFormData {
  evaluatorId: string;
  employeeId: string;
  type: 'supervisor' | 'peer' | 'subordinate' | 'self';
  period: string;
  responses: { [questionId: string]: { score: number; comment: string } };
  generalComment: string;
}

interface EvaluationStats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  completionRate: number;
}

@Component({
  selector: 'app-evaluations',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './evaluations.component.html',
  styleUrls: ['./evaluations.component.css'],
})
export class EvaluationsComponent implements OnInit {
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
  // State properties
  evaluations: Evaluation[] = [];
  selectedEmployee = '';
  selectedType = '';
  selectedPeriod = '2024-Q1';
  showEvaluationForm = false;
  showEvaluationDetail = false;
  currentEvaluation: EvaluationFormData | null = null;
  selectedEvaluationDetail: Evaluation | null = null;
  viewMode: 'matrix' | 'list' | 'stats' = 'matrix';
  filters = {
    search: '',
    status: '',
    type: '',
    evaluator: '',
  };

  // Data from mock source
  allEmployees = mockEmployees;
  allEvaluationCriteria = evaluationCriteria;
  allScaleLabels = scaleLabels;
  periods = ['2024-Q1', '2023-Q4', '2023-Q3', '2023-Q2'];

  evaluationTypes = [
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

  stats: EvaluationStats = {
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    completionRate: 0,
  };
  filteredEvaluations: Evaluation[] = [];

  constructor() {}

  ngOnInit(): void {
    this.loadEvaluations();
  }

  loadEvaluations(): void {
    // This function simulates fetching data based on the selected period
    const mockEvaluations: Evaluation[] = [];
    let evalId = 1;

    mockEmployees.forEach((employee) => {
      // Self evaluation
      mockEvaluations.push({
        id: `eval-${evalId++}`,
        evaluatorId: employee.id,
        employeeId: employee.id,
        type: 'self',
        period: this.selectedPeriod,
        status: Math.random() > 0.3 ? 'completed' : 'pending',
        responses: this.generateMockResponses(),
        submittedAt: Math.random() > 0.3 ? new Date() : undefined,
      });

      // Supervisor evaluation
      if (employee.supervisor) {
        mockEvaluations.push({
          id: `eval-${evalId++}`,
          evaluatorId: employee.supervisor,
          employeeId: employee.id,
          type: 'supervisor',
          period: this.selectedPeriod,
          status: Math.random() > 0.2 ? 'completed' : 'pending',
          responses: this.generateMockResponses(),
          submittedAt: Math.random() > 0.2 ? new Date() : undefined,
        });
      }

      // Peer evaluations
      (employee.teammates || []).slice(0, 2).forEach((teammateId) => {
        mockEvaluations.push({
          id: `eval-${evalId++}`,
          evaluatorId: teammateId,
          employeeId: employee.id,
          type: 'peer',
          period: this.selectedPeriod,
          status: Math.random() > 0.4 ? 'completed' : 'pending',
          responses: this.generateMockResponses(),
          submittedAt: Math.random() > 0.4 ? new Date() : undefined,
        });
      });

      // Subordinate evaluations
      (employee.subordinates || []).slice(0, 2).forEach((subordinateId) => {
        mockEvaluations.push({
          id: `eval-${evalId++}`,
          evaluatorId: subordinateId,
          employeeId: employee.id,
          type: 'subordinate',
          period: this.selectedPeriod,
          status: Math.random() > 0.5 ? 'completed' : 'pending',
          responses: this.generateMockResponses(),
          submittedAt: Math.random() > 0.5 ? new Date() : undefined,
        });
      });
    });

    this.evaluations = mockEvaluations;
    this.applyFilters();
    this.calculateStats();
  }

  generateMockResponses(): EvaluationResponse[] {
    const responses: EvaluationResponse[] = [];
    evaluationCriteria.forEach((criteria) => {
      criteria.questions.forEach((question) => {
        const score = Math.floor(Math.random() * 3) + 3; // 3-5 range
        responses.push({
          questionId: question.id,
          score: score,
          comment:
            Math.random() > 0.7 ? `Komentar untuk ${question.code}` : undefined,
        });
      });
    });
    return responses;
  }

  onPeriodChange(): void {
    this.loadEvaluations();
  }

  applyFilters(): void {
    this.filteredEvaluations = this.evaluations.filter((evaluation) => {
      const employee = this.allEmployees.find(
        (e) => e.id === evaluation.employeeId
      );
      const evaluator = this.allEmployees.find(
        (e) => e.id === evaluation.evaluatorId
      );

      if (this.filters.search) {
        const searchLower = this.filters.search.toLowerCase();
        const matchesEmployee = employee?.name
          .toLowerCase()
          .includes(searchLower);
        const matchesEvaluator = evaluator?.name
          .toLowerCase()
          .includes(searchLower);
        if (!matchesEmployee && !matchesEvaluator) return false;
      }

      if (this.filters.status && evaluation.status !== this.filters.status)
        return false;
      if (this.filters.type && evaluation.type !== this.filters.type)
        return false;
      if (
        this.filters.evaluator &&
        evaluation.evaluatorId !== this.filters.evaluator
      )
        return false;

      return true;
    });
  }

  clearFilters(): void {
    this.filters = { search: '', status: '', type: '', evaluator: '' };
    this.applyFilters();
  }

  calculateStats(): void {
    const total = this.evaluations.length;
    const completed = this.evaluations.filter(
      (e) => e.status === 'completed'
    ).length;
    const pending = this.evaluations.filter(
      (e) => e.status === 'pending'
    ).length;
    const inProgress = this.evaluations.filter(
      (e) => e.status === 'in-progress'
    ).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    this.stats = { total, completed, pending, inProgress, completionRate };
  }

  startEvaluation(employeeId: string, evaluationType: string): void {
    const currentUser = this.allEmployees[0]; // Assume current user

    const formData: EvaluationFormData = {
      evaluatorId: currentUser.id,
      employeeId,
      type: evaluationType as any,
      period: this.selectedPeriod,
      responses: {},
      generalComment: '',
    };

    this.allEvaluationCriteria.forEach((criteria) => {
      criteria.questions.forEach((question) => {
        formData.responses[question.id] = { score: 0, comment: '' };
      });
    });

    this.currentEvaluation = formData;
    this.showEvaluationForm = true;
  }

  handleResponseChange(
    questionId: string,
    score: number,
    comment: string = ''
  ): void {
    if (!this.currentEvaluation) return;
    this.currentEvaluation.responses[questionId] = { score, comment };
  }

  submitEvaluation(): void {
    if (!this.currentEvaluation) return;

    const unanswered = Object.values(this.currentEvaluation.responses).some(
      (r) => r.score === 0
    );
    if (unanswered) {
      alert('Mohon jawab semua pertanyaan.');
      return;
    }

    const newEvaluation: Evaluation = {
      id: `eval-${Date.now()}`,
      evaluatorId: this.currentEvaluation.evaluatorId,
      employeeId: this.currentEvaluation.employeeId,
      type: this.currentEvaluation.type,
      period: this.currentEvaluation.period,
      status: 'completed',
      responses: Object.entries(this.currentEvaluation.responses).map(
        ([questionId, data]) => ({
          questionId,
          score: data.score,
          comment: data.comment || undefined,
        })
      ),
      comments: this.currentEvaluation.generalComment || undefined,
      submittedAt: new Date(),
    };

    this.evaluations.push(newEvaluation);
    this.applyFilters();
    this.calculateStats();
    this.showEvaluationForm = false;
    this.currentEvaluation = null;
  }

  saveDraft(): void {
    if (!this.currentEvaluation) return;
    // Similar logic to submit, but with 'in-progress' status
    console.log('Saving draft...');
    this.showEvaluationForm = false;
    this.currentEvaluation = null;
  }

  viewEvaluationDetail(employeeId: string): void {
    const evaluation =
      this.evaluations.find((e) => e.employeeId === employeeId) || null;
    this.selectedEvaluationDetail = evaluation;
    this.showEvaluationDetail = true;
  }

  deleteEvaluation(evaluationId: string): void {
    if (confirm('Apakah Anda yakin ingin menghapus evaluasi ini?')) {
      this.evaluations = this.evaluations.filter((e) => e.id !== evaluationId);
      this.applyFilters();
      this.calculateStats();
    }
  }

  // --- Template Helper Methods ---
  getEmployeeName(id: string): string {
    return this.allEmployees.find((e) => e.id === id)?.name || 'Unknown';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed':
        return 'Selesai';
      case 'in-progress':
        return 'Sedang Berlangsung';
      case 'pending':
        return 'Menunggu';
      default:
        return status;
    }
  }

  getTypeConfig(type: string) {
    return this.evaluationTypes.find((t) => t.value === type);
  }

  getEvaluationProgress(employeeId: string) {
    const employeeEvals = this.evaluations.filter(
      (e) => e.employeeId === employeeId
    );
    const completedCount = new Set(
      employeeEvals.filter((e) => e.status === 'completed').map((e) => e.type)
    ).size;
    const totalTypes = new Set(employeeEvals.map((e) => e.type)).size;
    return totalTypes > 0 ? (completedCount / totalTypes) * 100 : 0;
  }

  getEvaluationStatusForType(employeeId: string, type: string): string {
    const evals = this.evaluations.filter(
      (e) => e.employeeId === employeeId && e.type === type
    );
    if (evals.some((e) => e.status === 'completed')) return 'completed';
    if (evals.some((e) => e.status === 'in-progress')) return 'in-progress';
    if (evals.length > 0) return 'pending';
    return 'none';
  }

  getEvaluationForDetail(questionId: string): EvaluationResponse | undefined {
    return this.selectedEvaluationDetail?.responses.find(
      (r) => r.questionId === questionId
    );
  }

  getAverageScoreForCriteria(criteriaId: string): number {
    if (!this.selectedEvaluationDetail) return 0;
    const criteria = this.allEvaluationCriteria.find(
      (c) => c.id === criteriaId
    );
    if (!criteria) return 0;

    const questionIds = new Set(criteria.questions.map((q) => q.id));
    const relevantResponses = this.selectedEvaluationDetail.responses.filter(
      (r) => questionIds.has(r.questionId)
    );

    if (relevantResponses.length === 0) return 0;
    const totalScore = relevantResponses.reduce((sum, r) => sum + r.score, 0);
    return totalScore / relevantResponses.length;
  }

  getAnsweredQuestionsCount(): number {
    if (!this.currentEvaluation) return 0;
    return Object.values(this.currentEvaluation.responses).filter(
      (r) => r.score > 0
    ).length;
  }

  getTotalQuestionsCount(): number {
    return this.allEvaluationCriteria.reduce(
      (sum, criteria) => sum + criteria.questions.length,
      0
    );
  }

  getCompletedCount(type: string): number {
    return this.evaluations.filter(
      (e) => e.type === type && e.status === 'completed'
    ).length;
  }

  getTotalCount(type: string): number {
    return this.evaluations.filter((e) => e.type === type).length;
  }

  getCompletedSelfEvaluationsCount(): number {
    return this.evaluations.filter(
      (e) => e.type === 'self' && e.status === 'completed'
    ).length;
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
