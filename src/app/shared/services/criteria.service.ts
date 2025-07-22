import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Criteria, Question } from '../models/app.types';

@Injectable({
  providedIn: 'root',
})
export class CriteriaService {
  private firestore: Firestore = inject(Firestore);
  private criteriaCollection = collection(this.firestore, 'criteria');

  /**
   * Retrieves all criteria from Firestore as an observable.
   * Includes the document ID for each criterion.
   * @returns An observable of the criteria array.
   */
  getCriteria(): Observable<Criteria[]> {
    const orderedCollection = query(this.criteriaCollection, orderBy('code'));

    return collectionData(orderedCollection, {
      idField: 'id',
    }) as Observable<Criteria[]>;
  }

  /**
   * Adds a new criterion document to the 'criteria' collection.
   * @param criteria The criteria object to add (without an id).
   * @returns A promise that resolves when the document is added.
   */
  addCriteria(criteria: Omit<Criteria, 'id'>): Promise<any> {
    return addDoc(this.criteriaCollection, criteria);
  }

  /**
   * Updates an existing criterion document in Firestore.
   * @param id The ID of the criterion document to update.
   * @param data The partial data to update.
   * @returns A promise that resolves when the update is complete.
   */
  updateCriteria(id: string, data: Partial<Criteria>): Promise<void> {
    const docRef = doc(this.firestore, 'criteria', id);
    return updateDoc(docRef, data);
  }

  /**
   * Deletes a criterion document from Firestore.
   * @param id The ID of the criterion document to delete.
   * @returns A promise that resolves when the deletion is complete.
   */
  deleteCriteria(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'criteria', id);
    return deleteDoc(docRef);
  }

  /**
   * Adds a new question to the 'questions' array of a specific criterion.
   * Uses a transaction to ensure data consistency.
   * @param criteriaId The ID of the parent criterion.
   * @param question The new question to add.
   * @returns A promise that resolves when the transaction is complete.
   */
  addQuestion(criteriaId: string, question: Question): Promise<void> {
    const docRef = doc(this.firestore, 'criteria', criteriaId);
    return runTransaction(this.firestore, async (transaction) => {
      const criteriaDoc = await transaction.get(docRef);
      if (!criteriaDoc.exists()) {
        throw 'Document does not exist!';
      }
      const existingQuestions = criteriaDoc.data()['questions'] || [];
      const newQuestions = [...existingQuestions, question];
      transaction.update(docRef, { questions: newQuestions });
    });
  }

  /**
   * Updates a specific question within a criterion's 'questions' array.
   * @param criteriaId The ID of the parent criterion.
   * @param updatedQuestion The question object with updated data.
   * @returns A promise that resolves when the update is complete.
   */
  updateQuestion(criteriaId: string, updatedQuestion: Question): Promise<void> {
    const docRef = doc(this.firestore, 'criteria', criteriaId);
    return runTransaction(this.firestore, async (transaction) => {
      const criteriaDoc = await transaction.get(docRef);
      if (!criteriaDoc.exists()) {
        throw 'Document does not exist!';
      }
      const existingQuestions = criteriaDoc.data()['questions'] || [];
      const newQuestions = existingQuestions.map((q: Question) =>
        q.id === updatedQuestion.id ? updatedQuestion : q
      );
      transaction.update(docRef, { questions: newQuestions });
    });
  }

  /**
   * Deletes a question from a criterion's 'questions' array.
   * @param criteriaId The ID of the parent criterion.
   * @param questionId The ID of the question to delete.
   * @returns A promise that resolves when the deletion is complete.
   */
  deleteQuestion(criteriaId: string, questionId: string): Promise<void> {
    const docRef = doc(this.firestore, 'criteria', criteriaId);
    return runTransaction(this.firestore, async (transaction) => {
      const criteriaDoc = await transaction.get(docRef);
      if (!criteriaDoc.exists()) {
        throw 'Document does not exist!';
      }
      const existingQuestions = criteriaDoc.data()['questions'] || [];
      const newQuestions = existingQuestions.filter(
        (q: Question) => q.id !== questionId
      );
      transaction.update(docRef, { questions: newQuestions });
    });
  }

  /**
   * Moves a question from one criterion to another.
   * This is a transactional operation to ensure atomicity.
   * @param question The question to move (must contain its original criteriaId).
   * @param newCriteriaId The ID of the destination criterion.
   * @returns A promise that resolves when the move is complete.
   */
  moveQuestion(question: Question, newCriteriaId: string): Promise<void> {
    const oldCriteriaRef = doc(this.firestore, 'criteria', question.criteriaId);
    const newCriteriaRef = doc(this.firestore, 'criteria', newCriteriaId);

    return runTransaction(this.firestore, async (transaction) => {
      const oldDoc = await transaction.get(oldCriteriaRef);
      const newDoc = await transaction.get(newCriteriaRef);

      if (!oldDoc.exists() || !newDoc.exists()) {
        throw 'One or both criteria documents do not exist!';
      }

      const oldQuestions = oldDoc.data()['questions'] || [];
      const updatedOldQuestions = oldQuestions.filter(
        (q: Question) => q.id !== question.id
      );
      transaction.update(oldCriteriaRef, { questions: updatedOldQuestions });

      const newQuestions = newDoc.data()['questions'] || [];
      const updatedQuestion = { ...question, criteriaId: newCriteriaId };
      const updatedNewQuestions = [...newQuestions, updatedQuestion];
      transaction.update(newCriteriaRef, { questions: updatedNewQuestions });
    });
  }
}
