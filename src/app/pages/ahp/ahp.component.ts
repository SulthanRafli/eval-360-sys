import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { evaluationCriteria } from '../../shared/data/mock-data';
import { Calculator, Info, LucideAngularModule } from 'lucide-angular';

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

@Component({
  selector: 'app-ahp',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule], // Import modul yang diperlukan
  templateUrl: './ahp.component.html',
  styleUrls: ['./ahp.component.css'],
})
export class AhpComponent implements OnInit {
  readonly Info = Info;
  readonly Calculator = Calculator;
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
    { value: 1, label: '1 - Sama penting' },
    { value: 2, label: '2 - Sedikit lebih penting' },
    { value: 3, label: '3 - Lebih penting' },
    { value: 4, label: '4 - Sangat lebih penting' },
    { value: 5, label: '5 - Mutlak lebih penting' },
    { value: 6, label: '6 - Antara 5 dan 7' },
    { value: 7, label: '7 - Sangat mutlak lebih penting' },
    { value: 8, label: '8 - Antara 7 dan 9' },
    { value: 9, label: '9 - Ekstrim lebih penting' },
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

  constructor() {}

  ngOnInit(): void {
    // Inisialisasi subkriteria dari data evaluasi
    const initialSubcriteria: Subcriteria[] = [];
    evaluationCriteria.forEach((criteria) => {
      initialSubcriteria.push(
        {
          id: 'sub-' + criteria.id,
          code: 'SK',
          name: 'Sangat Kurang',
          criteriaId: criteria.id,
        },
        {
          id: 'sub-' + criteria.id,
          code: 'K',
          name: 'Kurang',
          criteriaId: criteria.id,
        },
        {
          id: 'sub-' + criteria.id,
          code: 'C',
          name: 'Cukup',
          criteriaId: criteria.id,
        },
        {
          id: 'sub-' + criteria.id,
          code: 'B',
          name: 'Baik',
          criteriaId: criteria.id,
        },
        {
          id: 'sub-' + criteria.id,
          code: 'SB',
          name: 'Sangat Baik',
          criteriaId: criteria.id,
        }
      );
    });
    this.subcriteria = initialSubcriteria;

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
    const n = matrix.length;
    if (n === 0) return [];

    const rowSums = matrix.map((row) => row.reduce((sum, val) => sum + val, 0));
    const totalSum = rowSums.reduce((sum, val) => sum + val, 0);
    return rowSums.map((sum) => sum / totalSum);
  }

  calculateConsistencyRatio(matrix: number[][], weights: number[]): number {
    const n = matrix.length;
    if (n <= 2) return 0;

    const weightedSum = matrix.map((row) =>
      row.reduce((sum, val, j) => sum + val * weights[j], 0)
    );

    const lambdaMax =
      weightedSum.reduce((sum, val, i) => sum + val / weights[i], 0) / n;
    const ci = (lambdaMax - n) / (n - 1);
    const ri = this.randomIndex[n - 1] || 1.49;

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
    console.log('Subcriteria Weights:', this.subcriteriaWeights);
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
    console.log('Subcriteria Weights:', this.subcriteriaWeights);

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
}
