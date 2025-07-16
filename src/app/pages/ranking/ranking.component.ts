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
import { ChartData, ChartOptions, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

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
  imports: [CommonModule, FormsModule, LucideAngularModule, BaseChartDirective],
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

  // Chart configurations
  barChartView: [number, number] = [700, 400];
  pieChartView: [number, number] = [500, 400];

  // Chart.js data properties
  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], label: 'Total Score', backgroundColor: '#3B82F6' }],
  };
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          title: (context) => context[0].label,
          label: (context) => `Score: ${context.raw}`,
        },
      },
    },
  };
  barChartType: ChartType = 'bar';

  pieChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
        ],
      },
    ],
  };
  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw as number;
            const weight =
              this.criteriaDistribution.find((c) => c.name === label)?.weight ||
              0;
            return `${label}: ${value.toFixed(2)} (Weight: ${(
              weight * 100
            ).toFixed(1)}%)`;
          },
        },
      },
    },
  };
  pieChartType: ChartType = 'pie';
  criteriaDistribution: any[] = [];

  radarChartData: ChartData<'radar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Score',
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 2,
      },
    ],
  };
  radarChartOptions: ChartOptions<'radar'> = {
    responsive: true,
    scales: {
      r: {
        min: 0,
        max: 5,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };
  radarChartType: ChartType = 'radar';

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

  loadSavedAHPWeights(): void {
    const saved = localStorage.getItem('ahpWeights');
    if (saved) {
      try {
        const parsedWeights = JSON.parse(saved);
        this.savedWeights = parsedWeights;
        this.activeWeights =
          parsedWeights.find((w: SavedAHPWeights) => w.isActive) || null;
      } catch (error) {
        console.error('Error loading saved AHP weights:', error);
      }
    }
  }

  calculateAndSetEmployeeScores(): void {
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

    const criteriaSubcriteriaMapping: { [criteriaId: string]: string[] } = {};
    evaluationCriteria.forEach((criteria) => {
      criteriaSubcriteriaMapping[criteria.id] = criteria.questions.map(
        (q) => q.id
      );
    });

    let ahpScores: EmployeeAHPScore[];

    if (this.activeWeights) {
      ahpScores = calculateMultipleEmployeeScores(
        mockEvaluationData,
        this.activeWeights.weights,
        this.activeWeights.subcriteriaWeights,
        criteriaSubcriteriaMapping
      );
    } else {
      const equalWeights: { [criteriaId: string]: number } = {};
      const equalSubcriteriaWeights: {
        [criteriaId: string]: { [subcriteriaId: string]: number };
      } = {};

      evaluationCriteria.forEach((criteria) => {
        equalWeights[criteria.id] = 1 / evaluationCriteria.length;
        equalSubcriteriaWeights[criteria.id] = {};
        criteria.questions.forEach((question) => {
          equalSubcriteriaWeights[criteria.id][question.id] =
            1 / criteria.questions.length;
        });
      });

      ahpScores = calculateMultipleEmployeeScores(
        mockEvaluationData,
        equalWeights,
        equalSubcriteriaWeights,
        criteriaSubcriteriaMapping
      );
    }

    const detailedScores: DetailedEmployeeScore[] = ahpScores.map(
      (score, index) => {
        const employee = mockEmployees.find(
          (emp) => emp.id === score.employeeId
        );
        const evaluationCount =
          mockEvaluations.filter((e) => e.employeeId === score.employeeId)
            .length || 4;

        return {
          ...score,
          employee: employee!,
          rank: index + 1,
          evaluationCount,
        };
      }
    );

    this.employeeScores = detailedScores;
    this.topPerformers = this.employeeScores.slice(0, 3);
    this.updateChartData();
  }

  updateChartData(): void {
    // Bar Chart Data
    const top10Scores = this.employeeScores.slice(0, 10);
    this.barChartData = {
      labels: top10Scores.map((s) => s.employee.name.split(' ')[0]),
      datasets: [
        {
          data: top10Scores.map((s) => s.totalScore),
          label: 'Total Score',
          backgroundColor: '#3B82F6',
        },
      ],
    };

    // Pie Chart Data
    this.criteriaDistribution = evaluationCriteria.map((criteria, index) => {
      const avgScore =
        this.employeeScores.reduce((sum, emp) => {
          const criteriaScore = emp.criteriaScores.find(
            (cs) => cs.criteriaId === criteria.id
          );
          return sum + (criteriaScore?.totalWeightedScore || 0);
        }, 0) / this.employeeScores.length;

      return {
        name: criteria.name,
        value: avgScore,
        weight: this.activeWeights
          ? this.activeWeights.weights[criteria.id]
          : 1 / evaluationCriteria.length,
        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index],
      };
    });

    this.pieChartData = {
      labels: this.criteriaDistribution.map((c) => c.name),
      datasets: [
        {
          data: this.criteriaDistribution.map((c) => c.value),
          backgroundColor: this.criteriaDistribution.map((c) => c.color),
        },
      ],
    };

    // Radar Chart Data (for selected employee)
    this.updateRadarChart();
  }

  updateRadarChart(): void {
    if (this.selectedEmployeeId) {
      const selectedScore = this.employeeScores.find(
        (emp) => emp.employeeId === this.selectedEmployeeId
      );
      if (selectedScore) {
        const radarData = evaluationCriteria.map((criteria) => {
          const criteriaScore = selectedScore.criteriaScores.find(
            (cs) => cs.criteriaId === criteria.id
          );
          const avgSubcriteriaScore = criteriaScore
            ? criteriaScore.subcriteriaScores.reduce(
                (sum, sub) => sum + sub.score,
                0
              ) / criteriaScore.subcriteriaScores.length
            : 0;
          return {
            criteria: criteria.name,
            score: avgSubcriteriaScore,
          };
        });

        this.radarChartData = {
          labels: radarData.map((d) => d.criteria),
          datasets: [
            {
              data: radarData.map((d) => d.score),
              label: 'Score',
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.3)',
              borderWidth: 2,
            },
          ],
        };
      }
    }
  }

  onEmployeeSelectionChange(employeeId: string): void {
    this.selectedEmployeeId = employeeId;
    if (employeeId) {
      this.updateRadarChart();
    }
  }
}
