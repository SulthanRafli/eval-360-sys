// Utility functions for AHP calculations with subcriteria support

export interface AHPMatrix {
  matrix: number[][];
  weights: number[];
  consistencyRatio: number;
}

export interface SubcriteriaScore {
  subcriteriaId: string;
  score: number; // 1-5 (SK, K, C, B, SB)
  weight: number; // Local weight within criteria
  globalWeight: number; // Global weight (criteria weight * local weight)
  weightedScore: number; // score * globalWeight
}

export interface CriteriaScore {
  criteriaId: string;
  criteriaWeight: number;
  criteriaCode: string;
  score: number;
  scoreReal: number;
  label: string;
}

export interface EmployeeAHPScore {
  employeeId: string;
  criteriaScores: CriteriaScore[];
  totalScore: number;
  totalScoreReal: number;
  normalizedScore: number; // 0-100 scale
}

// Random Index values for consistency calculation
export const RANDOM_INDEX = [
  0, 0, 0.52, 0.89, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49,
];

/**
 * Calculate AHP weights from comparison matrix
 */
export function calculateAHPWeights(matrix: number[][]): AHPMatrix {
  const n = matrix.length;

  if (n === 0) {
    return { matrix: [], weights: [], consistencyRatio: 0 };
  }

  if (n === 1) {
    return { matrix: [[1]], weights: [1], consistencyRatio: 0 };
  }

  // Calculate weights using geometric mean method
  const weights = calculateGeometricMeanWeights(matrix);

  // Calculate consistency ratio
  const consistencyRatio = calculateConsistencyRatio(matrix, weights);

  return { matrix, weights, consistencyRatio };
}

/**
 * Calculate weights using geometric mean method
 */
function calculateGeometricMeanWeights(matrix: number[][]): number[] {
  const n = matrix.length;
  const geometricMeans: number[] = [];

  // Calculate geometric mean for each row
  for (let i = 0; i < n; i++) {
    let product = 1;
    for (let j = 0; j < n; j++) {
      product *= matrix[i][j];
    }
    geometricMeans[i] = Math.pow(product, 1 / n);
  }

  // Normalize to get weights
  const sum = geometricMeans.reduce((acc, val) => acc + val, 0);
  return geometricMeans.map((val) => val / sum);
}

/**
 * Calculate consistency ratio
 */
function calculateConsistencyRatio(
  matrix: number[][],
  weights: number[]
): number {
  const n = matrix.length;

  if (n <= 2) return 0;

  // Calculate lambda max
  let lambdaMax = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += matrix[i][j] * weights[j];
    }
    lambdaMax += sum * weights[i];
  }

  // Calculate consistency index
  const ci = (lambdaMax - n) / (n - 1);

  // Get random index
  const ri = RANDOM_INDEX[n] || 1.49;

  // Calculate consistency ratio
  return ci / ri;
}

/**
 * Calculate employee score using AHP weights and subcriteria
 */
export function calculateEmployeeAHPScore(
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
    const ratingConfig = ratingsMap.find(
      (r) =>
        score >= r.minValue && (r.maxValue === undefined || score < r.maxValue)
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
  const finalTotalScore = totalScoreReal / Object.keys(criteriaWeights).length;

  return {
    employeeId,
    criteriaScores: criteriaScores,
    totalScore,
    totalScoreReal: finalTotalScore,
    normalizedScore,
  };
}

/**
 * Calculate scores for multiple employees
 */
export function calculateMultipleEmployeeScores(
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
      calculateEmployeeAHPScore(
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
 * Validate AHP consistency for all criteria and subcriteria
 */
export function validateAHPConsistency(
  criteriaConsistencyRatio: number,
  subcriteriaConsistencyRatios: { [criteriaId: string]: number },
  threshold: number = 0.1
): {
  isValid: boolean;
  criteriaValid: boolean;
  subcriteriaValid: { [criteriaId: string]: boolean };
  issues: string[];
} {
  const issues: string[] = [];
  const criteriaValid = criteriaConsistencyRatio <= threshold;
  const subcriteriaValid: { [criteriaId: string]: boolean } = {};

  if (!criteriaValid) {
    issues.push(
      `Kriteria utama tidak konsisten (CR: ${criteriaConsistencyRatio.toFixed(
        3
      )})`
    );
  }

  Object.keys(subcriteriaConsistencyRatios).forEach((criteriaId) => {
    const cr = subcriteriaConsistencyRatios[criteriaId];
    const isValid = cr <= threshold;
    subcriteriaValid[criteriaId] = isValid;

    if (!isValid) {
      issues.push(
        `Subkriteria ${criteriaId} tidak konsisten (CR: ${cr.toFixed(3)})`
      );
    }
  });

  const isValid =
    criteriaValid && Object.values(subcriteriaValid).every((v) => v);

  return {
    isValid,
    criteriaValid,
    subcriteriaValid,
    issues,
  };
}

/**
 * Convert scale labels to numeric values
 */
export const SCALE_VALUES = {
  SK: 1, // Sangat Kurang
  K: 2, // Kurang
  C: 3, // Cukup
  B: 4, // Baik
  SB: 5, // Sangat Baik
};

/**
 * Convert numeric values to scale labels
 */
const ratingsMap = [
  { label: 'Sangat Baik', code: 'SB', minValue: 4.2 },
  { label: 'Baik', code: 'B', minValue: 3.4, maxValue: 4.2 },
  { label: 'Cukup', code: 'C', minValue: 2.6, maxValue: 3.4 },
  { label: 'Buruk', code: 'K', minValue: 1.8, maxValue: 2.6 },
  { label: 'Sangat Buruk', code: 'SK', minValue: 1.0, maxValue: 1.8 },
  { label: '-', code: '', minValue: 0, maxValue: 1.0 },
];

/**
 * Get scale description
 */
export function getScaleDescription(value: number): string {
  const descriptions = {
    1: 'Sangat Kurang',
    2: 'Kurang',
    3: 'Cukup',
    4: 'Baik',
    5: 'Sangat Baik',
  };
  return descriptions[value as keyof typeof descriptions] || 'Tidak Valid';
}

/**
 * Calculate weighted average for criteria with subcriteria
 */
export function calculateCriteriaWeightedAverage(
  subcriteriaScores: { [subcriteriaId: string]: number },
  subcriteriaWeights: { [subcriteriaId: string]: number }
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  Object.keys(subcriteriaScores).forEach((subcriteriaId) => {
    const score = subcriteriaScores[subcriteriaId];
    const weight = subcriteriaWeights[subcriteriaId] || 0;

    weightedSum += score * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
