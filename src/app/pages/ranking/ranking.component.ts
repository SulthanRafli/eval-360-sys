import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Settings,
  LucideAngularModule,
  Calculator,
  Trophy,
  Medal,
  Award,
  Star,
  Info,
} from 'lucide-angular';
import { ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { EvaluationService } from '../../shared/services/evaluation.service';
import { EmployeeService } from '../../shared/services/employee.service';
import { CriteriaService } from '../../shared/services/criteria.service';
import { AhpService } from '../../shared/services/ahp.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import moment from 'moment';
import { switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { CriteriaScore, EmployeeAHPScore } from '../../shared/models/app.types';

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, BaseChartDirective],
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.css'],
})
export class RankingComponent {
  // --- Injected Services ---
  private evaluationService = inject(EvaluationService);
  private employeeService = inject(EmployeeService);
  private criteriaService = inject(CriteriaService);
  private ahpService = inject(AhpService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // --- Icons ---
  readonly Settings = Settings;
  readonly Calculator = Calculator;
  readonly Trophy = Trophy;
  readonly Medal = Medal;
  readonly Award = Award;
  readonly Star = Star;
  readonly Info = Info;
  readonly ratingsMap = [
    { label: 'Sangat Baik', code: 'SB', minValue: 4.2 },
    { label: 'Baik', code: 'B', minValue: 3.4, maxValue: 4.2 },
    { label: 'Cukup', code: 'C', minValue: 2.6, maxValue: 3.4 },
    { label: 'Buruk', code: 'K', minValue: 1.8, maxValue: 2.6 },
    { label: 'Sangat Buruk', code: 'SK', minValue: 1.0, maxValue: 1.8 },
    { label: '-', code: '', minValue: 0, maxValue: 1.0 },
  ];

  // --- Reactive State ---
  isLoading = signal(true);
  selectedPeriod = signal(moment().format('YYYY-MM'));
  viewMode = signal<'table' | 'chart' | 'detailed'>('table');
  selectedEmployeeId = signal('');
  currentUser = this.authService.currentUserProfile();

  // --- Data Signals from Services ---
  allEmployees = toSignal(this.employeeService.getEmployees(), {
    initialValue: [],
  });
  allCriteria = toSignal(this.criteriaService.getCriteria(), {
    initialValue: [],
  });
  savedWeights = toSignal(this.ahpService.getSavedWeights(), {
    initialValue: [],
  });
  evaluations = toSignal(
    toObservable(this.selectedPeriod).pipe(
      switchMap((period) =>
        this.evaluationService.getEvaluationsByPeriod(period)
      )
    ),
    { initialValue: [] }
  );
  // --- Core Derived State ---
  activeWeights = computed(
    () => this.savedWeights().find((w) => w.isActive) || null
  );
  employeeScoresSorted = computed(() => {
    const employees = this.allEmployees();
    const evals = this.evaluations();
    const criteria = this.allCriteria();
    const weights = this.activeWeights();

    if (employees.length === 0 || evals.length === 0 || criteria.length === 0) {
      return [];
    }

    const evaluationData: {
      [employeeId: string]: { [criteriaId: string]: number[] };
    } = {};
    const evaluationCounts: { [employeeId: string]: number } = {};

    evals
      .filter((e) => e.status === 'completed')
      .forEach((e) => {
        if (!evaluationData[e.employeeId]) {
          evaluationData[e.employeeId] = {};
          evaluationCounts[e.employeeId] = 0;
        }
        evaluationCounts[e.employeeId]++;
        e.responses.forEach((r) => {
          if (!evaluationData[e.employeeId][r.criteriaId]) {
            evaluationData[e.employeeId][r.criteriaId] = [];
          }
          evaluationData[e.employeeId][r.criteriaId].push(r.score);
        });
      });

    const averagedScores: {
      [employeeId: string]: { [criteriaId: string]: number };
    } = {};
    for (const empId in evaluationData) {
      averagedScores[empId] = {};
      for (const cId in evaluationData[empId]) {
        const scores = evaluationData[empId][cId];
        averagedScores[empId][cId] =
          scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    }

    const criteriaSubcriteriaMapping: Record<string, string> = {};
    criteria.forEach((c) => {
      criteriaSubcriteriaMapping[c.id] = c.code;
    });

    let ahpScores: EmployeeAHPScore[];
    if (weights) {
      ahpScores = this.calculateMultipleEmployeeScores(
        averagedScores,
        weights.weights,
        weights.subcriteriaWeights ?? {},
        criteriaSubcriteriaMapping
      );
    } else {
      const equalWeights: { [cId: string]: number } = {};
      const equalSubWeights: { [cId: string]: { [sId: string]: number } } = {};
      criteria.forEach((c) => {
        equalWeights[c.id] = 1 / criteria.length;
        equalSubWeights[c.id] = {};
        c.questions.forEach((q) => {
          equalSubWeights[c.id][q.id] = 1 / c.questions.length;
        });
      });
      ahpScores = this.calculateMultipleEmployeeScores(
        averagedScores,
        equalWeights,
        equalSubWeights,
        criteriaSubcriteriaMapping
      );
    }

    const detailedScores = ahpScores.map((score, index) => {
      return {
        ...score,
        employee: employees.find((emp) => emp.id === score.employeeId)!,
        rank: index + 1,
        evaluationCount: evaluationCounts[score.employeeId] || 0,
      };
    });
    return detailedScores.sort((a, b) => {
      const nameA = a.employee.name.toLowerCase();
      const nameB = b.employee.name.toLowerCase();

      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
  });
  employeeScores = computed(() => {
    const employees = this.allEmployees();
    const evals = this.evaluations();
    const criteria = this.allCriteria();
    const weights = this.activeWeights();

    if (employees.length === 0 || evals.length === 0 || criteria.length === 0) {
      return [];
    }

    const evaluationData: {
      [employeeId: string]: { [criteriaId: string]: number[] };
    } = {};
    const evaluationCounts: { [employeeId: string]: number } = {};

    evals
      .filter((e) => e.status === 'completed')
      .forEach((e) => {
        if (!evaluationData[e.employeeId]) {
          evaluationData[e.employeeId] = {};
          evaluationCounts[e.employeeId] = 0;
        }
        evaluationCounts[e.employeeId]++;
        e.responses.forEach((r) => {
          if (!evaluationData[e.employeeId][r.criteriaId]) {
            evaluationData[e.employeeId][r.criteriaId] = [];
          }
          evaluationData[e.employeeId][r.criteriaId].push(r.score);
        });
      });

    const averagedScores: {
      [employeeId: string]: { [criteriaId: string]: number };
    } = {};
    for (const empId in evaluationData) {
      averagedScores[empId] = {};
      for (const cId in evaluationData[empId]) {
        const scores = evaluationData[empId][cId];
        averagedScores[empId][cId] =
          scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    }

    const criteriaSubcriteriaMapping: Record<string, string> = {};
    criteria.forEach((c) => {
      criteriaSubcriteriaMapping[c.id] = c.code;
    });

    let ahpScores: EmployeeAHPScore[];
    if (weights) {
      ahpScores = this.calculateMultipleEmployeeScores(
        averagedScores,
        weights.weights,
        weights.subcriteriaWeights ?? {},
        criteriaSubcriteriaMapping
      );
    } else {
      const equalWeights: { [cId: string]: number } = {};
      const equalSubWeights: { [cId: string]: { [sId: string]: number } } = {};
      criteria.forEach((c) => {
        equalWeights[c.id] = 1 / criteria.length;
        equalSubWeights[c.id] = {};
        c.questions.forEach((q) => {
          equalSubWeights[c.id][q.id] = 1 / c.questions.length;
        });
      });
      ahpScores = this.calculateMultipleEmployeeScores(
        averagedScores,
        equalWeights,
        equalSubWeights,
        criteriaSubcriteriaMapping
      );
    }

    const detailedScores = ahpScores.map((score, index) => {
      return {
        ...score,
        employee: employees.find((emp) => emp.id === score.employeeId)!,
        rank: index + 1,
        evaluationCount: evaluationCounts[score.employeeId] || 0,
      };
    });
    return detailedScores;
  });
  topPerformers = computed(() => this.employeeScores().slice(0, 3));
  pivotedMatrix = computed(() => {
    const weights = this.activeWeights();
    const criteria = this.allCriteria();

    if (!weights || criteria.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = criteria.map((c) => c.code);
    const subcriteriaOrder = ['SK', 'K', 'C', 'B', 'SB'];

    const subWeightsMap = new Map<string, Map<string, number>>();
    for (const critId in weights.subcriteriaWeights) {
      const innerMap = new Map<string, number>();
      for (const subCritKey in weights.subcriteriaWeights[critId]) {
        const suffix = subCritKey.split('-').pop() || '';
        innerMap.set(suffix, weights.subcriteriaWeights[critId][subCritKey]);
      }
      subWeightsMap.set(critId, innerMap);
    }

    const rows = [
      {
        label: 'Prioritas',
        values: criteria.map((c) => weights.weights[c.id] || 0),
      },
      ...[...subcriteriaOrder].reverse().map((subCritName) => ({
        label:
          {
            SB: 'Sangat Baik',
            B: 'Baik',
            C: 'Cukup',
            K: 'Kurang',
            SK: 'Sangat Kurang',
          }[subCritName] || '',
        values: criteria.map(
          (c) => subWeightsMap.get(c.id)?.get(subCritName) || 0
        ),
      })),
    ];

    return { headers, rows };
  });
  radarChartData = computed(() => {
    const selectedId = this.selectedEmployeeId();
    const selectedScore = this.employeeScores().find(
      (emp) => emp.employeeId === selectedId
    );
    if (!selectedId) {
      return { labels: [], datasets: [] };
    }
    if (selectedScore) {
      const radarData = this.allCriteria().map((c) => {
        const cScore = selectedScore.criteriaScores.find(
          (cs) => cs.criteriaId === c.id
        );
        const avgSubScore = cScore?.scoreReal;
        return { criteria: c.name, score: avgSubScore };
      });
      return {
        labels: radarData.map((d) => d.criteria),
        datasets: [
          {
            data: radarData.map((d) => d.score),
            label: 'Average Score',
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.3)',
          },
        ],
      };
    }
    return { labels: [], datasets: [] };
  });
  getSelectedEmployeeScore = computed(() => {
    return this.employeeScores().find(
      (e) => e.employeeId === this.selectedEmployeeId()
    );
  });

  // --- Chart Data ---
  radarChartOptions: ChartOptions<'radar'> = {
    responsive: true,
    scales: { r: { min: 0, max: 5, ticks: { stepSize: 1 } } },
  };

  // --- Template Helper Methods ---
  getRankIcon(rank: number) {
    switch (rank) {
      case 1:
        return Trophy;
      case 2:
        return Medal;
      case 3:
        return Award;
      default:
        return Star;
    }
  }

  goToAhp() {
    this.router.navigateByUrl('/ahp');
  }

  getRankClass(rank: number): string {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-300';
  }

  initials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getRankBadgeClass(rank: number): string {
    if (rank === 1) return 'from-yellow-400 to-yellow-600';
    if (rank === 2) return 'from-gray-300 to-gray-500';
    if (rank === 3) return 'from-amber-400 to-amber-600';
    return 'bg-gray-100 text-gray-800';
  }

  getCriteria(criteriaId: string, criteriaScores: CriteriaScore[]) {
    const cScore = criteriaScores.find((cs) => cs.criteriaId === criteriaId);
    return {
      score: cScore?.score || 0,
      label: cScore?.label || '-',
    };
  }

  getCriteriaBySelectedEmployee(criteriaId: string) {
    const criteriaScores =
      this.employeeScores().find(
        (val) => val.employeeId === this.selectedEmployeeId()
      )?.criteriaScores || [];
    const cScore = criteriaScores.find((cs) => cs.criteriaId === criteriaId);
    return {
      score: cScore?.score || 0,
      scoreReal: cScore?.scoreReal || 0,
      label: cScore?.label || '-',
    };
  }

  calculateMultipleEmployeeScores(
    employeeEvaluations: {
      [employeeId: string]: { [questionId: string]: number };
    },
    criteriaWeights: { [criteriaId: string]: number },
    subcriteriaWeights: {
      [criteriaId: string]: { [subcriteriaId: string]: number };
    },
    criteriaSubcriteriaMapping: Record<string, string>
  ): EmployeeAHPScore[] {
    return Object.keys(employeeEvaluations)
      .map((employeeId) =>
        this.calculateEmployeeAHPScore(
          employeeId,
          employeeEvaluations[employeeId],
          criteriaWeights,
          subcriteriaWeights,
          criteriaSubcriteriaMapping
        )
      )
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  calculateEmployeeAHPScore(
    employeeId: string,
    evaluationResponses: { [criteriaId: string]: number },
    criteriaWeights: { [criteriaId: string]: number },
    subcriteriaWeights: {
      [criteriaId: string]: { [subcriteriaId: string]: number };
    },
    criteriaSubcriteriaMapping: Record<string, string>
  ): EmployeeAHPScore {
    const criteriaScores: CriteriaScore[] = [];
    let totalScore = 0;
    let totalScoreReal = 0;

    // Calculate score for each criteria
    Object.keys(criteriaWeights).forEach((criteriaId) => {
      const criteriaCode = criteriaSubcriteriaMapping[criteriaId];
      const score = evaluationResponses[criteriaId] || 0;
      const ratingConfig = this.ratingsMap.find(
        (r) =>
          score >= r.minValue &&
          (r.maxValue === undefined || score < r.maxValue)
      );
      const criteriaWeight = criteriaWeights[criteriaId];
      const subcriteriaWeight = subcriteriaWeights[criteriaId];
      let targetKey: string | undefined = undefined;
      if (ratingConfig) {
        targetKey = Object.keys(subcriteriaWeight).find((key) =>
          key.endsWith(`-${ratingConfig.code}`)
        );
      }

      const scorePriority = targetKey
        ? subcriteriaWeight[targetKey] * criteriaWeight
        : 0;

      criteriaScores.push({
        criteriaId,
        criteriaWeight,
        criteriaCode,
        score: scorePriority,
        scoreReal: score,
        label: ratingConfig?.label || '-',
      });

      totalScore += scorePriority;
      totalScoreReal += score;
    });

    // Normalize score to 0-100 scale (assuming max possible score is 5)
    const maxPossibleScore = 5;
    const normalizedScore = (totalScore / maxPossibleScore) * 100;
    const finalTotalScore =
      totalScoreReal / Object.keys(criteriaWeights).length;

    return {
      employeeId,
      criteriaScores: criteriaScores,
      totalScore,
      totalScoreReal: finalTotalScore,
      normalizedScore,
    };
  }
}
