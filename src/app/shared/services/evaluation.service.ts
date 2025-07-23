import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  updateDoc,
  deleteDoc,
  where,
  query,
  writeBatch,
  addDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Evaluation, Employee } from '../models/app.types';

@Injectable({
  providedIn: 'root',
})
export class EvaluationService {
  private firestore: Firestore = inject(Firestore);

  private evaluationsCollection = collection(this.firestore, 'evaluations');

  /**
   * Retrieves all evaluations for a specific period from Firestore.
   * @param period The evaluation period to query (e.g., "2024-Q1").
   * @returns An observable of the Evaluation array.
   */
  getEvaluationsByPeriod(period: string): Observable<Evaluation[]> {
    const q = query(this.evaluationsCollection, where('period', '==', period));
    return collectionData(q, {
      idField: 'id',
    }) as Observable<Evaluation[]>;
  }

  /**
   * Adds a new evaluation document to the 'evaluations' collection.
   * @param evaluation The evaluation data to add (without an id).
   * @returns A promise that resolves with the new document reference.
   */
  addEvaluation(evaluation: Omit<Evaluation, 'id'>): Promise<any> {
    return addDoc(this.evaluationsCollection, evaluation as Evaluation);
  }

  /**
   * Updates an existing evaluation document, typically to submit responses.
   * @param id The ID of the evaluation document to update.
   * @param data The partial data to update.
   * @returns A promise that resolves when the update is complete.
   */
  updateEvaluation(id: string, data: Partial<Evaluation>): Promise<void> {
    const docRef = doc(this.evaluationsCollection, id);
    return updateDoc(docRef, data);
  }

  /**
   * Deletes an evaluation document from Firestore.
   * @param id The ID of the evaluation to delete.
   * @returns A promise that resolves when the deletion is complete.
   */
  deleteEvaluation(id: string): Promise<void> {
    const docRef = doc(this.evaluationsCollection, id);
    return deleteDoc(docRef);
  }

  /**
   * Generates all required pending evaluations for a given period for all employees.
   * This is an administrative action to kick off an evaluation cycle.
   * @param period The period for which to generate evaluations.
   * @param allEmployees The complete list of employees.
   * @returns A promise that resolves when the batch write is complete.
   */
  async generatePendingEvaluations(
    period: string,
    allEmployees: Employee[]
  ): Promise<void> {
    const batch = writeBatch(this.firestore);

    allEmployees.forEach((employee) => {
      this.createPendingEval(batch, period, employee.id, employee.id, 'self');

      if (employee.supervisor) {
        this.createPendingEval(
          batch,
          period,
          employee.id,
          employee.supervisor,
          'supervisor'
        );
      }

      employee.teammates.forEach((teammateId) => {
        this.createPendingEval(batch, period, employee.id, teammateId, 'peer');
      });

      employee.subordinates.forEach((subordinateId) => {
        this.createPendingEval(
          batch,
          period,
          employee.id,
          subordinateId,
          'subordinate'
        );
      });
    });

    return batch.commit();
  }

  private createPendingEval(
    batch: any,
    period: string,
    employeeId: string,
    evaluatorId: string,
    type: 'self' | 'supervisor' | 'peer' | 'subordinate'
  ) {
    const newEvalDocRef = doc(this.evaluationsCollection);
    const evaluation: Omit<Evaluation, 'id'> = {
      employeeId,
      evaluatorId,
      type,
      period,
      status: 'pending',
      responses: [],
    };
    batch.set(newEvalDocRef, evaluation);
  }
}
