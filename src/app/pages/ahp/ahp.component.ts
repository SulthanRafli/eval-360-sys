import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { evaluationCriteria } from '../../shared/data/mock-data';
import {
  Calculator,
  Eye,
  EyeClosed,
  Info,
  LucideAngularModule,
} from 'lucide-angular';
import { MatrixTableComponent } from './components/matrix-tables/matrix-tables.component';

// Definisikan interface yang sama seperti di React
interface AHPComparison {
  criteriaA: string;
  criteriaB: string;
  value: number;
}

interface SubcriteriaComparison {
  criteriaId: string;
  subcriteriaA: string;
  subcriteriaB: string;
  value: number;
}

interface Subcriteria {
  id: string;
  code: string;
  name: string;
  criteriaId: string;
  weight?: number;
}

interface SavedAHPWeights {
  id: string;
  name: string;
  weights: { [criteriaId: string]: number };
  subcriteriaWeights?: {
    [criteriaId: string]: { [subcriteriaId: string]: number };
  };
  consistencyRatio: number;
  subcriteriaConsistencyRatios: { [criteriaId: string]: number };
  createdAt: Date;
  isActive: boolean;
}

interface AhpResults {
  pairwiseMatrix: number[][];
  sumMatrix: number[];
  weights: number[];
  priorityRatios: number[];
}

@Component({
  selector: 'app-ahp',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatrixTableComponent,
  ],
  templateUrl: './ahp.component.html',
  styleUrls: ['./ahp.component.css'],
})
export class AhpComponent implements OnInit {
  readonly Info = Info;
  readonly Calculator = Calculator;
  readonly Eye = Eye;
  readonly EyeClosed = EyeClosed;

  criteriaNames: string[] = []; // Contoh: ['Harga', 'Kualitas', 'Merek', 'Toko']
  results!: AhpResults;
  showMatrices: boolean = false;
  showMatricesSubcriteria: boolean[] = [];
  summedMatrixForTable2: number[][] = [];
  rowSumsForTable2: number[] = [];
  matrixForTable3: number[][] = [];

  currentStep = 1;
  comparisons: AHPComparison[] = [];
  subcriteriaComparisons: SubcriteriaComparison[] = [];
  weights: { [key: string]: number } = {};
  subcriteriaWeights: {
    [criteriaId: string]: { [subcriteriaId: string]: number };
  } = {};
  consistencyRatio = 0;
  subcriteriaConsistencyRatios: { [criteriaId: string]: number } = {};
  showSaveModal = false;
  saveName = '';
  savedWeights: SavedAHPWeights[] = [];
  expandedCriteria: { [key: string]: boolean } = {};
  subcriteria: Subcriteria[] = [];
  showSubcriteriaModal = false;
  selectedCriteriaForSub = '';
  newSubcriteria = { name: '', code: '' };

  criteria = evaluationCriteria;
  scaleValues = [
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
  randomIndex = [0, 0, 0.52, 0.89, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];

  steps = [
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

  constructor() {
    this.criteriaNames = ['Nama K1', 'Nama K2', 'Nama K3'];
    this.results = {
      pairwiseMatrix: [
        [1.0, 2.0, 5.0],
        [0.5, 1.0, 3.0],
        [0.2, 0.33, 1.0],
      ],
      sumMatrix: [1.7, 3.33, 9.0], // Ini seharusnya adalah jumlah per kolom
      weights: [0.59, 0.3, 0.11],
      priorityRatios: [0.61, 0.31, 0.12],
    };
  }

  ngOnInit(): void {
    this.calculateDerivedMatrices();
    // Inisialisasi subkriteria dari data evaluasi
    const initialSubcriteria: Subcriteria[] = [];
    evaluationCriteria.forEach((criteria, i) => {
      initialSubcriteria.push(
        {
          id: `sub-A${i}-${criteria.id}`,
          code: 'SK',
          name: 'Sangat Kurang',
          criteriaId: criteria.id,
        },
        {
          id: `sub-B${i}-${criteria.id}`,
          code: 'K',
          name: 'Kurang',
          criteriaId: criteria.id,
        },
        {
          id: `sub-C${i}-${criteria.id}`,
          code: 'C',
          name: 'Cukup',
          criteriaId: criteria.id,
        },
        {
          id: `sub-D${i}-${criteria.id}`,
          code: 'B',
          name: 'Baik',
          criteriaId: criteria.id,
        },
        {
          id: `sub-E${i}-${criteria.id}`,
          code: 'SB',
          name: 'Sangat Baik',
          criteriaId: criteria.id,
        }
      );
    });
    this.subcriteria = initialSubcriteria;
    this.criteria.forEach(() => {
      this.showMatricesSubcriteria.push(false);
    });

    // Muat bobot yang tersimpan dari localStorage
    const saved = localStorage.getItem('ahpWeights');
    if (saved) {
      try {
        this.savedWeights = JSON.parse(saved);
      } catch (error) {
        console.error('Error loading saved weights:', error);
      }
    }
  }

  test(oldId: string, currentId: string) {
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

  private calculateDerivedMatrices(): void {
    // Perhitungan untuk "Tabel 3.6 Matriks Penjumlahan Setiap Baris"
    this.summedMatrixForTable2 = this.results.pairwiseMatrix.map((row) =>
      row.map((cell, colIndex) => cell * this.results.weights[colIndex])
    );
    this.rowSumsForTable2 = this.summedMatrixForTable2.map((row) =>
      row.reduce((sum, cell) => sum + cell, 0)
    );

    // Penyiapan data untuk "Tabel 3.11 Perhitungan Rasio Konsistensi Kriteria"
    // Catatan: Kode React tampaknya memiliki masalah di sini, memberikan array 1D ke komponen yang mengharapkan matriks 2D.
    // Saya menyusunnya sebagai matriks 2D dengan satu kolom seperti yang dimaksud.
    this.matrixForTable3 = this.results.sumMatrix.map((value) => [value]);
  }

  toggleMatrices(): void {
    this.showMatrices = !this.showMatrices;
  }

  toggleMatricesSub(index: number): void {
    this.showMatricesSubcriteria[index] = !this.showMatricesSubcriteria[index];
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
    const criteriaSubcriteria = this.subcriteria.filter(
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

  calculateEigenVector(matrix: number[][]): number[] {
    const n = matrix.length; // Number of rows
    if (n === 0) return [];

    const m = matrix[0].length; // Number of columns
    if (m === 0) return [];

    // Calculate the sum of each column
    const columnSums = new Array(m).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        columnSums[j] += matrix[i][j];
      }
    }

    const weights = matrix.map((row) => {
      const rowSum = row.reduce((sum, val, index) => {
        const wi = val / columnSums[index];
        return sum + wi;
      }, 0);

      return rowSum / n;
    });
    return weights;
  }

  calculateConsistencyRatio(matrix: number[][], weights: number[]): number {
    const n = matrix.length;
    if (n <= 2) return 0;

    const weightedSum = matrix.map((row, i) =>
      row.reduce((sum, val, j) => sum + val * weights[j], 0)
    );

    const lambdaMax =
      weightedSum.reduce((sum, val, i) => sum + val / weights[i], 0) / n;

    const ci = (lambdaMax - n) / (n - 1);
    const ri = this.randomIndex[n - 1] || 1.49;

    console.log(ci);
    console.log(ri);
    console.log(ci / ri);
    return ci / ri;
  }

  calculateWeights(): void {
    const matrix = this.createMatrix(this.comparisons, this.criteria);
    const eigenVector = this.calculateEigenVector(matrix);
    const cr = this.calculateConsistencyRatio(matrix, eigenVector);

    const newWeights: { [key: string]: number } = {};
    this.criteria.forEach((criterion, index) => {
      newWeights[criterion.id] = eigenVector[index] || 0;
    });

    this.weights = newWeights;
    this.consistencyRatio = cr;

    const newSubcriteriaWeights: {
      [criteriaId: string]: { [subcriteriaId: string]: number };
    } = {};
    const newSubcriteriaConsistencyRatios: { [criteriaId: string]: number } =
      {};

    this.criteria.forEach((criterion) => {
      const criteriaSubcriteria = this.subcriteria.filter(
        (s) => s.criteriaId === criterion.id
      );

      if (criteriaSubcriteria.length > 1) {
        const subMatrix = this.createSubcriteriaMatrix(
          this.subcriteriaComparisons,
          criterion.id
        );
        if (subMatrix.length > 0) {
          const subEigenVector = this.calculateEigenVector(subMatrix);
          const subCR = this.calculateConsistencyRatio(
            subMatrix,
            subEigenVector
          );

          newSubcriteriaWeights[criterion.id] = {};
          criteriaSubcriteria.forEach((sub, index) => {
            newSubcriteriaWeights[criterion.id][sub.id] =
              subEigenVector[index] || 0;
          });

          newSubcriteriaConsistencyRatios[criterion.id] = subCR;
        }
      } else if (criteriaSubcriteria.length === 1) {
        newSubcriteriaWeights[criterion.id] = {};
        newSubcriteriaWeights[criterion.id][criteriaSubcriteria[0].id] = 1.0;
        newSubcriteriaConsistencyRatios[criterion.id] = 0;
      }
    });

    this.subcriteriaWeights = newSubcriteriaWeights;
    this.subcriteriaConsistencyRatios = newSubcriteriaConsistencyRatios;
  }

  // --- Event Handlers ---
  handleComparisonChange(
    criteriaA: string,
    criteriaB: string,
    value: number
  ): void {
    const index = this.comparisons.findIndex(
      (c) =>
        (c.criteriaA === criteriaA && c.criteriaB === criteriaB) ||
        (c.criteriaA === criteriaB && c.criteriaB === criteriaA)
    );
    if (index > -1) {
      this.comparisons.splice(index, 1);
    }

    this.comparisons.push({ criteriaA, criteriaB, value });
  }

  handleSubcriteriaComparisonChange(
    criteriaId: string,
    subcriteriaA: string,
    subcriteriaB: string,
    value: number
  ): void {
    const index = this.subcriteriaComparisons.findIndex(
      (c) =>
        c.criteriaId === criteriaId &&
        ((c.subcriteriaA === subcriteriaA && c.subcriteriaB === subcriteriaB) ||
          (c.subcriteriaA === subcriteriaB && c.subcriteriaB === subcriteriaA))
    );
    if (index > -1) {
      this.subcriteriaComparisons.splice(index, 1);
    }
    this.subcriteriaComparisons.push({
      criteriaId,
      subcriteriaA,
      subcriteriaB,
      value,
    });
  }

  resetComparisons(): void {
    this.comparisons = [];
    this.subcriteriaComparisons = [];
    this.weights = {};
    this.subcriteriaWeights = {};
    this.consistencyRatio = 0;
    this.subcriteriaConsistencyRatios = {};
  }

  saveWeights(): void {
    if (!this.saveName.trim()) return;

    const newSavedWeights: SavedAHPWeights = {
      id: Date.now().toString(),
      name: this.saveName.trim(),
      weights: this.weights,
      subcriteriaWeights: this.subcriteriaWeights,
      consistencyRatio: this.consistencyRatio,
      subcriteriaConsistencyRatios: this.subcriteriaConsistencyRatios,
      createdAt: new Date(),
      isActive: false,
    };

    this.savedWeights.push(newSavedWeights);
    localStorage.setItem('ahpWeights', JSON.stringify(this.savedWeights));

    this.showSaveModal = false;
    this.saveName = '';
  }

  activateWeights(id: string): void {
    this.savedWeights.forEach((w) => (w.isActive = w.id === id));
    localStorage.setItem('ahpWeights', JSON.stringify(this.savedWeights));
  }

  deleteWeights(id: string): void {
    this.savedWeights = this.savedWeights.filter((w) => w.id !== id);
    localStorage.setItem('ahpWeights', JSON.stringify(this.savedWeights));
  }

  addSubcriteria(): void {
    if (
      !this.newSubcriteria.name.trim() ||
      !this.newSubcriteria.code.trim() ||
      !this.selectedCriteriaForSub
    )
      return;

    const newSub: Subcriteria = {
      id: `sub-${Date.now()}`,
      code: this.newSubcriteria.code.trim(),
      name: this.newSubcriteria.name.trim(),
      criteriaId: this.selectedCriteriaForSub,
    };

    this.subcriteria.push(newSub);
    this.newSubcriteria = { name: '', code: '' };
    this.showSubcriteriaModal = false;
    this.selectedCriteriaForSub = '';
  }

  removeSubcriteria(subcriteriaId: string): void {
    this.subcriteria = this.subcriteria.filter((s) => s.id !== subcriteriaId);
    this.subcriteriaComparisons = this.subcriteriaComparisons.filter(
      (c) =>
        c.subcriteriaA !== subcriteriaId && c.subcriteriaB !== subcriteriaId
    );
  }

  toggleCriteriaExpansion(criteriaId: string): void {
    this.expandedCriteria[criteriaId] = !this.expandedCriteria[criteriaId];
  }

  // --- Getter Functions for Template ---
  getComparisonValue(criteriaA: string, criteriaB: string): number {
    const comparison = this.comparisons.find(
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
    const comparison = this.subcriteriaComparisons.find(
      (c) =>
        c.criteriaId === criteriaId &&
        ((c.subcriteriaA === subcriteriaA && c.subcriteriaB === subcriteriaB) ||
          (c.subcriteriaA === subcriteriaB && c.subcriteriaB === subcriteriaA))
    );
    return comparison?.value || 1;
  }

  getSubcriteriaForCriteria(criteriaId: string): Subcriteria[] {
    return this.subcriteria.filter((s) => s.criteriaId === criteriaId);
  }

  // Helper untuk mendapatkan slice di template
  getSlicedSubcriteria(
    subcriteria: Subcriteria[],
    index: number
  ): Subcriteria[] {
    return subcriteria.slice(index + 1);
  }

  getSubWeight(criterionId: string, subId: string): number {
    return this.subcriteriaWeights?.[criterionId]?.[subId] ?? 0;
  }

  getWeight(criterionId: string, subId: string): number {
    return (
      (this.weights?.[criterionId] ?? 0) *
      (this.subcriteriaWeights?.[criterionId]?.[subId] ?? 0)
    );
  }

  getValueSub(criteriaId: string, idA: string, idB: string) {
    return this.scaleValues.findIndex(
      (s) =>
        s.value === this.getSubcriteriaComparisonValue(criteriaId, idA, idB)
    );
  }

  getDescSub(criteriaId: string, idA: string, idB: string) {
    return this.scaleValues.find(
      (s) =>
        s.value === this.getSubcriteriaComparisonValue(criteriaId, idA, idB)
    )?.description;
  }

  getValue(idA: string, idB: string) {
    return this.scaleValues.findIndex(
      (s) => s.value === this.getComparisonValue(idA, idB)
    );
  }

  getDesc(idA: string, idB: string) {
    return this.scaleValues.find(
      (s) => s.value === this.getComparisonValue(idA, idB)
    )?.description;
  }

  getSelectedScale(ev: any): number {
    const value = ev?.target?.value || 1;
    const selectedScale = this.scaleValues[parseInt(value)];
    return selectedScale?.value || 1;
  }
}
