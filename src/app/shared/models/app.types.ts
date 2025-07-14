// src/app/core/models/app.types.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  department: string;
  position: string;
  level: 'senior' | 'junior';
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  level: 'senior' | 'junior';
  supervisor?: string;
  status?: string;
  teammates: string[];
  subordinates: string[];
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
  submittedAt?: Date;
}

export interface AHPComparison {
  criteriaA: string;
  criteriaB: string;
  value: number;
}
