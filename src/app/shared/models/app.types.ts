import { Timestamp } from '@angular/fire/firestore';

// src/app/core/models/app.types.ts
export interface Employee {
  id: string;
  name: string;
  email: string;
  password: string;
  department: string;
  position: string;
  level: 'senior' | 'junior' | 'admin';
  supervisor?: string;
  status?: string;
  teammates: string[];
  subordinates: string[];
  disabled?: boolean;
}

export interface Question {
  id: string;
  code: string;
  text: string;
  criteriaId: string;
}

export interface Criteria {
  id: string;
  code: string;
  name: string;
  questions: Question[];
}

export interface EvaluationResponse {
  criteriaId: string;
  questionId: string;
  score: number;
  comment?: string;
}

export interface Evaluation {
  id: string;
  evaluatorId: string;
  employeeId: string;
  type: 'supervisor' | 'teammate' | 'self' | 'subordinate' | 'peer';
  period: string;
  status: 'pending' | 'completed' | 'in-progress';
  responses: EvaluationResponse[];
  comments?: string;
  submittedAt?: Date | Timestamp;
}

export interface AHPComparison {
  criteriaA: string;
  criteriaB: string;
  value: number;
}

export interface SubcriteriaComparison {
  criteriaId: string;
  subcriteriaA: string;
  subcriteriaB: string;
  value: number;
}

export interface Subcriteria {
  id: string;
  code: string;
  name: string;
  criteriaId: string;
}

export interface AhpResults {
  pairwiseMatrix: number[][];
  pairwiseSumMatrix: number[];
  weightsMatrix: number[][];
  sumWeightsMatrix: number[];
  weights: number[];
  weightSubcriteria?: number[];
  priorityRatios: number[];
  everyRowMatrix: number[][];
  sumEveryRowMatrix: number[];
  lambdaMax: number;
  ci: number;
  cr: number;
  statusCr: string;
}

export interface AHPWeights {
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

export interface Header {
  code: string;
  name: string;
}

export interface EvaluationFormData {
  evaluatorId: string;
  employeeId: string;
  type: 'supervisor' | 'peer' | 'subordinate' | 'self';
  period: string;
  responses: {
    [questionId: string]: {
      criteriaId: string;
      score: number;
      comment: string;
    };
  };
  generalComment: string;
}

export interface EvaluationStats {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
  totalOfAverages: number;
}

export interface Activity {
  id: string;
  message: string;
  user: string;
  timestamp: Date;
  icon: any;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
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
