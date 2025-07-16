import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  evaluationCriteria,
  mockEmployees,
  mockEvaluations,
} from '../../shared/data/mock-data';
import {
  calculateMultipleEmployeeScores,
  EmployeeAHPScore,
} from '../../shared/utils/ahpCalculations';
import {
  Settings,
  LucideAngularModule,
  Calculator,
  Trophy,
  Medal,
  Award,
  Star,
} from 'lucide-angular';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

// Interfaces
interface SavedAHPWeights {
  id: string;
  name: string;
  weights: { [criteriaId: string]: number };
  subcriteriaWeights: {
    [criteriaId: string]: { [subcriteriaId: string]: number };
  };
  consistencyRatio: number;
  subcriteriaConsistencyRatios: { [criteriaId: string]: number };
  createdAt: Date;
  isActive: boolean;
}

interface DetailedEmployeeScore extends EmployeeAHPScore {
  employee: any;
  rank: number;
  evaluationCount: number;
}

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, NgxChartsModule],
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.css'],
})
export class RankingComponent implements OnInit {
  readonly Settings = Settings;
  readonly Calculator = Calculator;
  readonly Trophy = Trophy;
  readonly Medal = Medal;
  readonly Award = Award;
  readonly Star = Star;
  // Component State
  selectedPeriod = '2024-Q1';
  viewMode: 'table' | 'chart' | 'detailed' = 'table';
  savedWeights: SavedAHPWeights[] = [];
  activeWeights: SavedAHPWeights | null = null;
  employeeScores: DetailedEmployeeScore[] = [];
  selectedEmployeeId = '';

  // Derived data for charts
  topPerformers: DetailedEmployeeScore[] = [];
  barChartData: any[] = [];
  pieChartData: any[] = [];
  radarChartData: any[] = [];

  // Chart configurations
  barChartView: [number, number] = [700, 400];
  pieChartView: [number, number] = [500, 400];

  // Custom color scheme for the bar chart
  barChartColorScheme: Color = {
    name: 'employeeScores',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#3B82F6'],
  };

  // Custom color scheme for the pie chart
  pieChartColorScheme: Color = {
    name: 'criteriaDistribution',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'],
  };
  public evaluationCriteria = evaluationCriteria;

  constructor() {}

  ngOnInit(): void {
    this.loadAhpWeights();
    this.calculateAndSetEmployeeScores();
  }

  loadAhpWeights(): void {
    const saved = localStorage.getItem('ahpWeights');
    if (saved) {
      try {
        const parsedWeights: SavedAHPWeights[] = JSON.parse(saved);
        this.savedWeights = parsedWeights;
        this.activeWeights = parsedWeights.find((w) => w.isActive) || null;
      } catch (error) {
        console.error('Error loading saved AHP weights:', error);
      }
    }
  }

  calculateAndSetEmployeeScores(): void {
    // Mock evaluation data generation (as in the React component)
    const mockEvaluationData: {
      [employeeId: string]: { [questionId: string]: number };
    } = {};
    mockEmployees.forEach((employee) => {
      mockEvaluationData[employee.id] = {};
      evaluationCriteria.forEach((criteria) => {
        criteria.questions.forEach((question) => {
          const baseScore = 3.5 + Math.random() * 1.5;
          mockEvaluationData[employee.id][question.id] = Math.round(baseScore);
        });
      });
    });

    // Define weights and mapping
    let weights: { [key: string]: number };
    let subcriteriaWeights: { [key: string]: { [key: string]: number } };
    const criteriaSubcriteriaMapping: { [criteriaId: string]: string[] } = {};
    evaluationCriteria.forEach((criteria) => {
      criteriaSubcriteriaMapping[criteria.id] = criteria.questions.map(
        (q) => q.id
      );
    });

    if (this.activeWeights) {
      weights = this.activeWeights.weights;
      subcriteriaWeights = this.activeWeights.subcriteriaWeights;
    } else {
      // Fallback to equal weights
      weights = {};
      subcriteriaWeights = {};
      evaluationCriteria.forEach((c) => {
        weights[c.id] = 1 / evaluationCriteria.length;
        subcriteriaWeights[c.id] = {};
        c.questions.forEach((q) => {
          subcriteriaWeights[c.id][q.id] = 1 / c.questions.length;
        });
      });
    }

    const ahpScores = calculateMultipleEmployeeScores(
      mockEvaluationData,
      weights,
      subcriteriaWeights,
      criteriaSubcriteriaMapping
    );

    this.employeeScores = ahpScores.map((score, index) => {
      const employee = mockEmployees.find((emp) => emp.id === score.employeeId);
      const evaluationCount =
        mockEvaluations.filter((e) => e.employeeId === score.employeeId)
          .length || 4;
      return { ...score, employee, rank: index + 1, evaluationCount };
    });

    this.prepareDerivedData();
  }

  prepareDerivedData(): void {
    this.topPerformers = this.employeeScores.slice(0, 3);

    // Data for Bar Chart
    this.barChartData = this.employeeScores.slice(0, 10).map((score) => ({
      name: score.employee.name.split(' ')[0],
      value: score.totalScore,
      extra: {
        normalized: score.normalizedScore,
      },
    }));

    // Data for Pie Chart
    this.pieChartData = evaluationCriteria.map((criteria) => {
      const avgScore =
        this.employeeScores.reduce((sum, emp) => {
          const criteriaScore = emp.criteriaScores.find(
            (cs) => cs.criteriaId === criteria.id
          );
          return sum + (criteriaScore?.totalWeightedScore || 0);
        }, 0) / this.employeeScores.length;
      return { name: criteria.name, value: avgScore };
    });

    if (this.selectedEmployeeId) {
      this.updateRadarChartData();
    }
  }

  onEmployeeSelectionChange(employeeId: string): void {
    this.selectedEmployeeId = employeeId;
    if (employeeId) {
      this.updateRadarChartData();
    } else {
      this.radarChartData = [];
    }
  }

  updateRadarChartData(): void {
    const employeeScore = this.employeeScores.find(
      (e) => e.employeeId === this.selectedEmployeeId
    );
    if (!employeeScore) return;

    this.radarChartData = employeeScore.criteriaScores.map((cs) => {
      const criteria = evaluationCriteria.find((c) => c.id === cs.criteriaId);
      const avgScore =
        cs.subcriteriaScores.reduce((sum, sub) => sum + sub.score, 0) /
        cs.subcriteriaScores.length;
      return { name: criteria?.name || 'Unknown', value: avgScore };
    });
  }

  // --- Template Helper Methods ---

  getRankBadgeClass(rank: number): string {
    if (rank === 1) return 'from-yellow-400 to-yellow-600';
    if (rank === 2) return 'from-gray-300 to-gray-500';
    if (rank === 3) return 'from-amber-400 to-amber-600';
    return 'bg-gray-100 text-gray-800';
  }

  getAverageScoreForCriteria(
    employeeScore: DetailedEmployeeScore,
    criteriaId: string
  ): number {
    const criteriaScore = employeeScore.criteriaScores.find(
      (cs) => cs.criteriaId === criteriaId
    );
    if (!criteriaScore || criteriaScore.subcriteriaScores.length === 0)
      return 0;
    return (
      criteriaScore.subcriteriaScores.reduce((sum, sub) => sum + sub.score, 0) /
      criteriaScore.subcriteriaScores.length
    );
  }

  getSelectedEmployeeScore(): DetailedEmployeeScore | undefined {
    return this.employeeScores.find(
      (e) => e.employeeId === this.selectedEmployeeId
    );
  }

  exportResults(format: 'pdf' | 'excel'): void {
    console.log(`Exporting ranking results as ${format}`);
    // Actual export implementation would go here
  }

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

  getRankClass(rank: number): string {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-300';
  }

  initials(name: string): string {
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  }

  formatPercentage(val: number): string {
    return `${val.toFixed(1)}%`;
  }

  formatScore(val: number): string {
    return val.toFixed(2);
  }
}
