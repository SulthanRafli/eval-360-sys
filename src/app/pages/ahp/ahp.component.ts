import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Calculator,
  Eye,
  EyeClosed,
  FileText,
  Info,
  LucideAngularModule,
  Plus,
} from 'lucide-angular';
import { MatrixTableComponent } from './components/matrix-tables/matrix-tables.component';
import {
  AHPComparison,
  AhpResults,
  AHPWeights,
  Criteria,
  Header,
  Subcriteria,
  SubcriteriaComparison,
} from '../../shared/models/app.types';
import { Subscription } from 'rxjs';
import { AhpService } from '../../shared/services/ahp.service';
import { CriteriaService } from '../../shared/services/criteria.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-ahp',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatrixTableComponent,
    RouterModule,
  ],
  templateUrl: './ahp.component.html',
  styleUrls: ['./ahp.component.css'],
  providers: [DatePipe],
})
export class AhpComponent implements OnInit {
  // Injected Services
  private criteriaService = inject(CriteriaService);
  private ahpService = inject(AhpService);
  private subscriptions = new Subscription();

  // Icons
  readonly Info = Info;
  readonly Calculator = Calculator;
  readonly Eye = Eye;
  readonly EyeClosed = EyeClosed;
  readonly FileText = FileText;
  readonly Plus = Plus;

  // Signals for reactive state management
  isLoading = signal(true);
  currentStep = signal(1);
  criteria = signal<Criteria[]>([]);
  subcriteria = signal<Subcriteria[]>([]);
  comparisons = signal<AHPComparison[]>([]);
  subcriteriaComparisons = signal<SubcriteriaComparison[]>([]);
  weights = signal<{ [key: string]: number }>({});
  subcriteriaWeights = signal<{
    [criteriaId: string]: { [subcriteriaId: string]: number };
  }>({});
  consistencyRatio = signal(0);
  subcriteriaConsistencyRatios = signal<{ [criteriaId: string]: number }>({});
  savedWeights = signal<AHPWeights[]>([]);

  // UI State signals
  showSaveModal = signal(false);
  saveName = '';
  expandedCriteria = signal<{ [key: string]: boolean }>({});
  showMatrices = signal(false);
  showMatricesSubcriteria = signal<boolean[]>([]);

  // Matrix results signals
  results = signal<AhpResults>({
    pairwiseMatrix: [],
    pairwiseSumMatrix: [],
    weightsMatrix: [],
    sumWeightsMatrix: [],
    weights: [],
    priorityRatios: [],
    everyRowMatrix: [],
    sumEveryRowMatrix: [],
    lambdaMax: 0,
    ci: 0,
    cr: 0,
    statusCr: '-',
  });
  resultsCriteria = signal<AhpResults[]>([]);

  // Computed signals
  headerCriteria = computed(() =>
    this.criteria().map((val) => ({
      code: val.code,
      name: val.name,
    }))
  );

  // AHP Constants
  readonly scaleValues = [
    {
      value: 1 / 9,
      label: '1/9',
      description: 'Ekstrim kurang penting',
      color: 'bg-red-600',
    },
    {
      value: 1 / 8,
      label: '1/8',
      description: 'Antara 1/9 dan 1/7',
      color: 'bg-red-500',
    },
    {
      value: 1 / 7,
      label: '1/7',
      description: 'Sangat mutlak kurang penting',
      color: 'bg-red-400',
    },
    {
      value: 1 / 6,
      label: '1/6',
      description: 'Antara 1/7 dan 1/5',
      color: 'bg-red-300',
    },
    {
      value: 1 / 5,
      label: '1/5',
      description: 'Mutlak kurang penting',
      color: 'bg-orange-400',
    },
    {
      value: 1 / 4,
      label: '1/4',
      description: 'Sangat kurang penting',
      color: 'bg-orange-300',
    },
    {
      value: 1 / 3,
      label: '1/3',
      description: 'Kurang penting',
      color: 'bg-yellow-400',
    },
    {
      value: 1 / 2,
      label: '1/2',
      description: 'Sedikit kurang penting',
      color: 'bg-yellow-300',
    },
    { value: 1, label: '1', description: 'Sama penting', color: 'bg-gray-400' },
    {
      value: 2,
      label: '2',
      description: 'Sedikit lebih penting',
      color: 'bg-green-300',
    },
    {
      value: 3,
      label: '3',
      description: 'Lebih penting',
      color: 'bg-green-400',
    },
    {
      value: 4,
      label: '4',
      description: 'Sangat lebih penting',
      color: 'bg-green-500',
    },
    {
      value: 5,
      label: '5',
      description: 'Mutlak lebih penting',
      color: 'bg-blue-400',
    },
    {
      value: 6,
      label: '6',
      description: 'Antara 5 dan 7',
      color: 'bg-blue-500',
    },
    {
      value: 7,
      label: '7',
      description: 'Sangat mutlak lebih penting',
      color: 'bg-blue-600',
    },
    {
      value: 8,
      label: '8',
      description: 'Antara 7 dan 9',
      color: 'bg-purple-500',
    },
    {
      value: 9,
      label: '9',
      description: 'Ekstrim lebih penting',
      color: 'bg-purple-600',
    },
  ];
  readonly randomIndex = [0, 0, 0.52, 0.89, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];
  readonly steps = [
    {
      number: 1,
      title: 'Perbandingan Kriteria',
      description: 'Bandingkan kriteria utama',
    },
    {
      number: 2,
      title: 'Kelola Subkriteria',
      description: 'Atur subkriteria untuk setiap kriteria',
    },
    {
      number: 3,
      title: 'Perbandingan Subkriteria',
      description: 'Bandingkan subkriteria dalam setiap kriteria',
    },
    {
      number: 4,
      title: 'Hasil & Simpan',
      description: 'Lihat hasil dan simpan bobot',
    },
  ];
  readonly defaultSubscriteria = [
    {
      code: 'SK',
      name: 'Sangat Kurang',
    },
    {
      code: 'K',
      name: 'Kurang',
    },
    {
      code: 'C',
      name: 'Cukup',
    },
    {
      code: 'B',
      name: 'Baik',
    },
    {
      code: 'SB',
      name: 'Sangat Baik',
    },
  ];

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadInitialData(): void {
    this.isLoading.set(true);

    const criteriaSub = this.criteriaService
      .getCriteria()
      .subscribe((criteria) => {
        this.criteria.set(criteria);
        this.isLoading.set(false);

        const initialSubcriteria: Subcriteria[] = [];
        criteria.forEach((criteriaItem) => {
          this.defaultSubscriteria.forEach((subcriteria) => {
            initialSubcriteria.push({
              id: `${criteriaItem.id}-${subcriteria.code}`,
              code: subcriteria.code,
              name: subcriteria.name,
              criteriaId: criteriaItem.id,
            });
          });
        });
        this.subcriteria.set(initialSubcriteria);
      });

    const weightsSub = this.ahpService
      .getSavedWeights()
      .subscribe((weights) => {
        this.savedWeights.set(weights);
      });

    this.subscriptions.add(criteriaSub);
    this.subscriptions.add(weightsSub);
  }

  formatCreatedAt(timestamp: any): Date {
    const date = new Date(timestamp.seconds * 1000);
    return date;
  }

  // --- Matrix Operations ---
  createMatrix(comparisons: AHPComparison[], criteriaList: any[]): number[][] {
    const n = criteriaList.length;
    const matrix = Array(n)
      .fill(null)
      .map(() => Array(n).fill(1));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const comparison = comparisons.find(
            (c) =>
              (c.criteriaA === criteriaList[i].id &&
                c.criteriaB === criteriaList[j].id) ||
              (c.criteriaA === criteriaList[j].id &&
                c.criteriaB === criteriaList[i].id)
          );
          if (comparison) {
            matrix[i][j] =
              comparison.criteriaA === criteriaList[i].id
                ? comparison.value
                : 1 / comparison.value;
          }
        }
      }
    }
    return matrix;
  }

  createSubcriteriaMatrix(
    comparisons: SubcriteriaComparison[],
    criteriaId: string
  ): number[][] {
    const criteriaSubcriteria = this.subcriteria().filter(
      (s) => s.criteriaId === criteriaId
    );
    const n = criteriaSubcriteria.length;
    if (n <= 1) return [];

    const matrix = Array(n)
      .fill(null)
      .map(() => Array(n).fill(1));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const comparison = comparisons.find(
            (c) =>
              c.criteriaId === criteriaId &&
              ((c.subcriteriaA === criteriaSubcriteria[i].id &&
                c.subcriteriaB === criteriaSubcriteria[j].id) ||
                (c.subcriteriaA === criteriaSubcriteria[j].id &&
                  c.subcriteriaB === criteriaSubcriteria[i].id))
          );
          if (comparison) {
            matrix[i][j] =
              comparison.subcriteriaA === criteriaSubcriteria[i].id
                ? comparison.value
                : 1 / comparison.value;
          }
        }
      }
    }
    return matrix;
  }

  calculateEigenVector(matrix: number[][]): {
    weightsMatrix: number[][];
    weights: number[];
    columnSums: number[];
    rowSums: number[];
  } {
    const n = matrix.length;
    if (n === 0)
      return { weightsMatrix: [], weights: [], columnSums: [], rowSums: [] };

    const m = matrix[0].length;
    if (m === 0)
      return { weightsMatrix: [], weights: [], columnSums: [], rowSums: [] };

    const columnSums = new Array(m).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        columnSums[j] += matrix[i][j];
      }
    }

    const rowSums: number[] = [];
    const weightsMatrix = Array(n)
      .fill(null)
      .map(() => Array(n).fill(1));
    const weights = matrix.map((row, i) => {
      const rowSum = row.reduce((sum, val, index) => {
        const wi = val / columnSums[index];
        weightsMatrix[i][index] = wi;
        return sum + wi;
      }, 0);
      rowSums.push(rowSum);
      return rowSum / n;
    });

    return {
      weightsMatrix,
      weights,
      columnSums,
      rowSums,
    };
  }

  calculateConsistencyRatio(
    matrix: number[][],
    weights: number[]
  ): {
    matrixRow: number[][];
    sumMatrixRow: number[];
    priorityRatios: number[];
    lambdaMax: number;
    ci: number;
    cr: number;
  } {
    const n = matrix.length;
    if (n <= 2)
      return {
        matrixRow: [],
        sumMatrixRow: [],
        priorityRatios: [],
        lambdaMax: 0,
        ci: 0,
        cr: 0,
      };

    const matrixRow = Array(n)
      .fill(null)
      .map(() => Array(n).fill(1));
    const sumMatrixRow: number[] = [];
    const priorityRatios: number[] = [];

    const weightedSum = matrix.map((row, i) => {
      const rowSum = row.reduce((sum, val, j) => {
        matrixRow[i][j] = val * weights[j];
        return sum + val * weights[j];
      }, 0);
      sumMatrixRow.push(rowSum);
      return rowSum;
    });

    const lambdaMax =
      weightedSum.reduce((sum, val, i) => {
        priorityRatios.push(val / weights[i]);
        return sum + val / weights[i];
      }, 0) / n;

    const ci = (lambdaMax - n) / (n - 1);
    const ri = this.randomIndex[n - 1] || 1.49;
    const cr = ci / ri;

    return {
      matrixRow,
      sumMatrixRow,
      priorityRatios,
      lambdaMax,
      cr,
      ci,
    };
  }

  calculateWeights(): void {
    const matrix = this.createMatrix(this.comparisons(), this.criteria());
    const eigenVector = this.calculateEigenVector(matrix);
    const result = this.calculateConsistencyRatio(matrix, eigenVector.weights);

    this.results.set({
      pairwiseMatrix: matrix,
      pairwiseSumMatrix: eigenVector.columnSums,
      weightsMatrix: eigenVector.weightsMatrix,
      sumWeightsMatrix: eigenVector.rowSums,
      weights: eigenVector.weights,
      priorityRatios: result.priorityRatios,
      everyRowMatrix: result.matrixRow,
      sumEveryRowMatrix: result.sumMatrixRow,
      lambdaMax: result.lambdaMax,
      cr: result.cr,
      ci: result.ci,
      statusCr: result.cr <= 0.1 ? 'Baik' : 'Buruk',
    });

    const newWeights: { [key: string]: number } = {};
    this.criteria().forEach((criterion, index) => {
      newWeights[criterion.id] = eigenVector.weights[index] || 0;
    });

    this.weights.set(newWeights);
    this.consistencyRatio.set(result.cr);

    const newSubcriteriaWeights: {
      [criteriaId: string]: { [subcriteriaId: string]: number };
    } = {};
    const newSubcriteriaConsistencyRatios: { [criteriaId: string]: number } =
      {};
    const newResultsCriteria: AhpResults[] = [];

    this.criteria().forEach((criterion) => {
      const criteriaSubcriteria = this.subcriteria().filter(
        (s) => s.criteriaId === criterion.id
      );

      if (criteriaSubcriteria.length > 1) {
        const subMatrix = this.createSubcriteriaMatrix(
          this.subcriteriaComparisons(),
          criterion.id
        );
        const subEigenVector = this.calculateEigenVector(subMatrix);
        const resultSub = this.calculateConsistencyRatio(
          subMatrix,
          subEigenVector.weights
        );

        newResultsCriteria.push({
          pairwiseMatrix: subMatrix,
          pairwiseSumMatrix: subEigenVector.columnSums,
          weightsMatrix: subEigenVector.weightsMatrix,
          sumWeightsMatrix: subEigenVector.rowSums,
          weights: subEigenVector.weights,
          priorityRatios: resultSub.priorityRatios,
          everyRowMatrix: resultSub.matrixRow,
          sumEveryRowMatrix: resultSub.sumMatrixRow,
          lambdaMax: resultSub.lambdaMax,
          cr: resultSub.cr,
          ci: resultSub.ci,
          statusCr: resultSub.cr <= 0.1 ? 'Baik' : 'Buruk',
        });

        newSubcriteriaWeights[criterion.id] = {};
        criteriaSubcriteria.forEach((sub, index) => {
          newSubcriteriaWeights[criterion.id][sub.id] =
            subEigenVector.weights[index] || 0;
        });

        newSubcriteriaConsistencyRatios[criterion.id] = resultSub.cr;
      } else if (criteriaSubcriteria.length === 1) {
        newSubcriteriaWeights[criterion.id] = {};
        newSubcriteriaWeights[criterion.id][criteriaSubcriteria[0].id] = 1.0;
        newSubcriteriaConsistencyRatios[criterion.id] = 0;
      }
    });

    this.resultsCriteria.set(newResultsCriteria);
    this.subcriteriaWeights.set(newSubcriteriaWeights);
    this.subcriteriaConsistencyRatios.set(newSubcriteriaConsistencyRatios);
  }

  handleComparisonChange(
    criteriaA: string,
    criteriaB: string,
    value: number
  ): void {
    const currentComparisons = [...this.comparisons()];
    const index = currentComparisons.findIndex(
      (c) =>
        (c.criteriaA === criteriaA && c.criteriaB === criteriaB) ||
        (c.criteriaA === criteriaB && c.criteriaB === criteriaA)
    );

    if (index > -1) {
      currentComparisons.splice(index, 1);
    }

    currentComparisons.push({ criteriaA, criteriaB, value });
    this.comparisons.set(currentComparisons);
  }

  handleSubcriteriaComparisonChange(
    criteriaId: string,
    subcriteriaA: string,
    subcriteriaB: string,
    value: number
  ): void {
    const currentSubComparisons = [...this.subcriteriaComparisons()];
    const index = currentSubComparisons.findIndex(
      (c) =>
        c.criteriaId === criteriaId &&
        ((c.subcriteriaA === subcriteriaA && c.subcriteriaB === subcriteriaB) ||
          (c.subcriteriaA === subcriteriaB && c.subcriteriaB === subcriteriaA))
    );

    if (index > -1) {
      currentSubComparisons.splice(index, 1);
    }

    currentSubComparisons.push({
      criteriaId,
      subcriteriaA,
      subcriteriaB,
      value,
    });

    this.subcriteriaComparisons.set(currentSubComparisons);
  }

  resetComparisons(): void {
    this.currentStep.set(1);
    this.comparisons.set([]);
    this.subcriteriaComparisons.set([]);
    this.weights.set({});
    this.subcriteriaWeights.set({});
    this.consistencyRatio.set(0);
    this.subcriteriaConsistencyRatios.set({});
  }

  async saveWeights(): Promise<void> {
    const name = this.saveName.trim();
    if (!name) return;

    const newSavedWeights: Omit<AHPWeights, 'id'> = {
      name,
      weights: this.weights(),
      subcriteriaWeights: this.subcriteriaWeights(),
      consistencyRatio: this.consistencyRatio(),
      subcriteriaConsistencyRatios: this.subcriteriaConsistencyRatios(),
      createdAt: new Date(),
      isActive: false,
    };

    try {
      await this.ahpService.addWeights(newSavedWeights);
      this.showSaveModal.set(false);
      this.saveName = '';
      this.resetComparisons();
    } catch (error) {
      console.error('Error saving weights:', error);
    }
  }

  async activateWeights(id: string): Promise<void> {
    try {
      await this.ahpService.activateWeights(id);
    } catch (error) {
      console.error('Error activating weights:', error);
    }
  }

  async deleteWeights(id: string): Promise<void> {
    try {
      await this.ahpService.deleteWeights(id);
    } catch (error) {
      console.error('Error deleting weights:', error);
    }
  }

  getSlicedCriteria(index: number): Criteria[] {
    return this.criteria().slice(index + 1);
  }

  getSlicedSubcriteria(
    subcriteria: Subcriteria[],
    index: number
  ): Subcriteria[] {
    return subcriteria.slice(index + 1);
  }

  toggleCriteriaExpansion(criteriaId: string): void {
    const currentExpanded = { ...this.expandedCriteria() };
    currentExpanded[criteriaId] = !currentExpanded[criteriaId];
    this.expandedCriteria.set(currentExpanded);
  }

  getComparisonValue(criteriaA: string, criteriaB: string): number {
    const comparison = this.comparisons().find(
      (c) =>
        (c.criteriaA === criteriaA && c.criteriaB === criteriaB) ||
        (c.criteriaA === criteriaB && c.criteriaB === criteriaA)
    );
    return comparison?.value || 1;
  }

  getSubcriteriaComparisonValue(
    criteriaId: string,
    subcriteriaA: string,
    subcriteriaB: string
  ): number {
    const comparison = this.subcriteriaComparisons().find(
      (c) =>
        c.criteriaId === criteriaId &&
        ((c.subcriteriaA === subcriteriaA && c.subcriteriaB === subcriteriaB) ||
          (c.subcriteriaA === subcriteriaB && c.subcriteriaB === subcriteriaA))
    );
    return comparison?.value || 1;
  }

  getSubcriteriaForCriteria(criteriaId: string): Subcriteria[] {
    return this.subcriteria().filter((s) => s.criteriaId === criteriaId);
  }

  getSubWeight(criterionId: string, subId: string): number {
    return this.subcriteriaWeights()?.[criterionId]?.[subId] ?? 0;
  }

  getWeight(criterionId: string, subId: string): number {
    return (
      (this.weights()?.[criterionId] ?? 0) *
      (this.subcriteriaWeights()?.[criterionId]?.[subId] ?? 0)
    );
  }

  getValueSub(criteriaId: string, idA: string, idB: string): number {
    return this.scaleValues.findIndex(
      (s) =>
        s.value === this.getSubcriteriaComparisonValue(criteriaId, idA, idB)
    );
  }

  getDescSub(criteriaId: string, idA: string, idB: string): string | undefined {
    return this.scaleValues.find(
      (s) =>
        s.value === this.getSubcriteriaComparisonValue(criteriaId, idA, idB)
    )?.description;
  }

  getValue(idA: string, idB: string): number {
    return this.scaleValues.findIndex(
      (s) => s.value === this.getComparisonValue(idA, idB)
    );
  }

  getDesc(idA: string, idB: string): string | undefined {
    return this.scaleValues.find(
      (s) => s.value === this.getComparisonValue(idA, idB)
    )?.description;
  }

  getSelectedScale(ev: any): number {
    const value = ev?.target?.value || 1;
    const selectedScale = this.scaleValues[parseInt(value)];
    return selectedScale?.value || 1;
  }

  getPreviousSubcriteriaValue(oldId: string, currentId: string): void {
    const oldValue: number[] = [];
    const subA = this.getSubcriteriaForCriteria(oldId);
    subA.forEach((sa, i) => {
      const subB = this.getSlicedSubcriteria(
        this.getSubcriteriaForCriteria(oldId),
        i
      );
      subB.forEach((sb, j) => {
        const value = this.getValueSub(oldId, sa.id, sb.id);
        const selectedScale = this.scaleValues[value];
        oldValue.push(selectedScale?.value || 1);
      });
    });

    let index = 0;
    const subAC = this.getSubcriteriaForCriteria(currentId);
    subAC.forEach((sa, i) => {
      const subBC = this.getSlicedSubcriteria(
        this.getSubcriteriaForCriteria(currentId),
        i
      );
      subBC.forEach((sb, j) => {
        this.handleSubcriteriaComparisonChange(
          currentId,
          sa.id,
          sb.id,
          oldValue[index]
        );
        index++;
      });
    });
  }

  toggleMatrices(): void {
    this.showMatrices.update((show) => !show);
  }

  toggleMatricesSub(index: number): void {
    const currentMatrices = [...this.showMatricesSubcriteria()];
    currentMatrices[index] = !currentMatrices[index];
    this.showMatricesSubcriteria.set(currentMatrices);
  }
}
