import {
  AHPComparison,
  Criteria,
  SubcriteriaComparison,
  Subcriteria,
  AhpResults,
  EmployeeAHPScore,
  CriteriaScore,
} from '../models/app.types';

export class AHPCalculationUtils {
  private static readonly RANDOM_INDEX = [
    0, 0, 0.52, 0.89, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49,
  ];

  private static readonly RATINGS_MAP = [
    { label: 'Sangat Baik', code: 'SB', minValue: 4.2 },
    { label: 'Baik', code: 'B', minValue: 3.4, maxValue: 4.2 },
    { label: 'Cukup', code: 'C', minValue: 2.6, maxValue: 3.4 },
    { label: 'Buruk', code: 'K', minValue: 1.8, maxValue: 2.6 },
    { label: 'Sangat Buruk', code: 'SK', minValue: 1.0, maxValue: 1.8 },
    { label: '-', code: '', minValue: 0, maxValue: 1.0 },
  ];

  /**
   * Create pairwise comparison matrix from comparisons
   */
  static createMatrix(
    comparisons: AHPComparison[],
    criteriaList: Criteria[]
  ): number[][] {
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

  /**
   * Create subcriteria matrix for specific criteria
   */
  static createSubcriteriaMatrix(
    comparisons: SubcriteriaComparison[],
    criteriaId: string,
    subcriteria: Subcriteria[]
  ): number[][] {
    const criteriaSubcriteria = subcriteria.filter(
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

  /**
   * Calculate eigenvector (priority weights) from matrix
   */
  static calculateEigenVector(matrix: number[][]): {
    weightsMatrix: number[][];
    weights: number[];
    columnSums: number[];
    rowSums: number[];
  } {
    const n = matrix.length;
    if (n === 0)
      return { weightsMatrix: [], weights: [], columnSums: [], rowSums: [] };

    const m = matrix[0]?.length || 0;
    if (m === 0)
      return { weightsMatrix: [], weights: [], columnSums: [], rowSums: [] };

    // Calculate column sums
    const columnSums = new Array(m).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        columnSums[j] += matrix[i][j];
      }
    }

    // Normalize matrix and calculate weights
    const rowSums: number[] = [];
    const weightsMatrix = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    const weights = matrix.map((row, i) => {
      const rowSum = row.reduce((sum, val, index) => {
        const normalizedValue = val / columnSums[index];
        weightsMatrix[i][index] = normalizedValue;
        return sum + normalizedValue;
      }, 0);

      rowSums.push(rowSum);
      return rowSum / n;
    });

    return { weightsMatrix, weights, columnSums, rowSums };
  }

  /**
   * Calculate consistency ratio
   */
  static calculateCR(
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

    if (n <= 2) {
      return {
        matrixRow: [],
        sumMatrixRow: [],
        priorityRatios: [],
        lambdaMax: 0,
        ci: 0,
        cr: 0,
      };
    }

    const matrixRow = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));
    const sumMatrixRow: number[] = [];
    const priorityRatios: number[] = [];

    // Calculate weighted sum
    const weightedSum = matrix.map((row, i) => {
      const rowSum = row.reduce((sum, val, j) => {
        const weightedVal = val * weights[j];
        matrixRow[i][j] = weightedVal;
        return sum + weightedVal;
      }, 0);

      sumMatrixRow.push(rowSum);
      return rowSum;
    });

    // Calculate lambda max
    const lambdaMax =
      weightedSum.reduce((sum, val, i) => {
        const ratio = val / weights[i];
        priorityRatios.push(ratio);
        return sum + ratio;
      }, 0) / n;

    // Calculate consistency metrics
    const ci = (lambdaMax - n) / (n - 1);
    const ri = this.RANDOM_INDEX[n - 1] || 1.49;
    const cr = ci / ri;

    return { matrixRow, sumMatrixRow, priorityRatios, lambdaMax, cr, ci };
  }

  /**
   * Calculate complete AHP results for criteria
   */
  static calculateAHPResults(
    comparisons: AHPComparison[],
    criteria: Criteria[]
  ): AhpResults {
    const matrix = this.createMatrix(comparisons, criteria);
    const ev = this.calculateEigenVector(matrix);
    const crResult = this.calculateCR(matrix, ev.weights);

    // Convert weights array to object with criteria IDs
    const weightsObject: { [key: string]: number } = {};
    criteria.forEach((criterion, index) => {
      weightsObject[criterion.id] = ev.weights[index] || 0;
    });

    return {
      pairwiseMatrix: matrix,
      pairwiseSumMatrix: ev.columnSums,
      weightsMatrix: ev.weightsMatrix,
      sumWeightsMatrix: ev.rowSums,
      weights: ev.weights,
      priorityRatios: crResult.priorityRatios,
      everyRowMatrix: crResult.matrixRow,
      sumEveryRowMatrix: crResult.sumMatrixRow,
      lambdaMax: crResult.lambdaMax,
      cr: crResult.cr,
      ci: crResult.ci,
      statusCr: crResult.cr <= 0.1 ? 'Baik' : 'Buruk',
    };
  }

  /**
   * Calculate subcriteria weights for all criteria
   */
  static calculateSubcriteriaWeights(
    subcriteriaComparisons: SubcriteriaComparison[],
    criteria: Criteria[],
    subcriteria: Subcriteria[]
  ): {
    subcriteriaWeights: {
      [criteriaId: string]: { [subcriteriaId: string]: number };
    };
    subcriteriaConsistencyRatios: { [criteriaId: string]: number };
    resultsCriteria: AhpResults[];
  } {
    const subcriteriaWeights: {
      [criteriaId: string]: { [subcriteriaId: string]: number };
    } = {};
    const subcriteriaConsistencyRatios: { [criteriaId: string]: number } = {};
    const resultsCriteria: AhpResults[] = [];

    criteria.forEach((criterion) => {
      const criteriaSubcriteria = subcriteria.filter(
        (s) => s.criteriaId === criterion.id
      );

      if (criteriaSubcriteria.length > 1) {
        const subMatrix = this.createSubcriteriaMatrix(
          subcriteriaComparisons,
          criterion.id,
          subcriteria
        );
        const ev = this.calculateEigenVector(subMatrix);
        const result = this.calculateCR(subMatrix, ev.weights);

        // Calculate normalized weights
        const maxValue = Math.max(...ev.weights);
        const weightSubcriteria = ev.weights.map((val) => val / maxValue);

        resultsCriteria.push({
          pairwiseMatrix: subMatrix,
          pairwiseSumMatrix: ev.columnSums,
          weightsMatrix: ev.weightsMatrix,
          sumWeightsMatrix: ev.rowSums,
          weights: ev.weights,
          weightSubcriteria: weightSubcriteria,
          priorityRatios: result.priorityRatios,
          everyRowMatrix: result.matrixRow,
          sumEveryRowMatrix: result.sumMatrixRow,
          lambdaMax: result.lambdaMax,
          cr: result.cr,
          ci: result.ci,
          statusCr: result.cr <= 0.1 ? 'Baik' : 'Buruk',
        });

        subcriteriaWeights[criterion.id] = {};
        criteriaSubcriteria.forEach((sub, index) => {
          subcriteriaWeights[criterion.id][sub.id] =
            weightSubcriteria[index] || 0;
        });

        subcriteriaConsistencyRatios[criterion.id] = result.cr;
      } else if (criteriaSubcriteria.length === 1) {
        // Single subcriteria gets full weight
        subcriteriaWeights[criterion.id] = {};
        subcriteriaWeights[criterion.id][criteriaSubcriteria[0].id] = 1.0;
        subcriteriaConsistencyRatios[criterion.id] = 0;
      }
    });

    return {
      subcriteriaWeights,
      subcriteriaConsistencyRatios,
      resultsCriteria,
    };
  }

  /**
   * Calculate employee AHP score
   */
  static calculateEmployeeAHPScore(
    employeeId: string,
    evaluationResponses: { [criteriaId: string]: number },
    criteriaW: { [criteriaId: string]: number },
    subcriteriaW: {
      [criteriaId: string]: { [subcriteriaId: string]: number };
    },
    criteriaMapping: Record<string, string>
  ): EmployeeAHPScore {
    const criteriaScores: CriteriaScore[] = [];
    let totalScore = 0;
    let totalReal = 0;

    Object.keys(criteriaW).forEach((cId) => {
      const criteriaCode = criteriaMapping[cId];
      const score = evaluationResponses[cId] || 0;

      const ratingConfig = this.RATINGS_MAP.find(
        (r) =>
          score >= r.minValue &&
          (r.maxValue === undefined || score < r.maxValue)
      );

      const cw = criteriaW[cId];
      const subcw = subcriteriaW[cId] || {};

      let targetKey: string | undefined = undefined;
      if (ratingConfig) {
        targetKey = Object.keys(subcw).find((key) =>
          key.endsWith(`-${ratingConfig.code}`)
        );
      }

      const scorePriority = targetKey ? subcw[targetKey] * cw : 0;

      criteriaScores.push({
        criteriaId: cId,
        criteriaWeight: cw,
        criteriaCode,
        score: scorePriority,
        scoreReal: score,
        label: ratingConfig?.label || '-',
      });

      totalScore += scorePriority;
      totalReal += score;
    });

    // Normalize score to 0-100 scale
    const maxPossibleScore = 5;
    const normalized = (totalScore / maxPossibleScore) * 100;
    const final = totalReal / Object.keys(criteriaW).length;

    return {
      employeeId,
      criteriaScores,
      totalScore,
      totalScoreReal: final,
      normalizedScore: normalized,
    };
  }

  /**
   * Calculate multiple employee scores and rank them
   */
  static calculateMultipleEmployeeScores(
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

  /**
   * Generate equal weights for criteria when no AHP weights are set
   */
  static generateEqualWeights(criteria: Criteria[]): {
    criteriaWeights: { [cId: string]: number };
    subcriteriaWeights: { [cId: string]: { [sId: string]: number } };
  } {
    const criteriaWeights: { [cId: string]: number } = {};
    const subcriteriaWeights: { [cId: string]: { [sId: string]: number } } = {};

    criteria.forEach((c) => {
      criteriaWeights[c.id] = 1 / criteria.length;
      subcriteriaWeights[c.id] = {};

      c.questions.forEach((q) => {
        subcriteriaWeights[c.id][q.id] = 1 / c.questions.length;
      });
    });

    return { criteriaWeights, subcriteriaWeights };
  }

  /**
   * Check if consistency ratio is acceptable
   */
  static isConsistencyAcceptable(cr: number): boolean {
    return cr <= 0.1;
  }

  /**
   * Get consistency status text
   */
  static getConsistencyStatus(cr: number): string {
    return this.isConsistencyAcceptable(cr) ? 'Konsisten' : 'Tidak Konsisten';
  }
}
