import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Employee } from '../models/app.types';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private firestore: Firestore = inject(Firestore);

  // Create a collection reference with the type-safe converter
  private employeesCollection = collection(this.firestore, 'employees');

  /**
   * Retrieves all employees from Firestore as a real-time observable stream.
   * @returns An observable of the Employee array.
   */
  getEmployees(): Observable<Employee[]> {
    return collectionData(this.employeesCollection, {
      idField: 'id',
    }) as Observable<Employee[]>;
  }

  /**
   * Adds a new employee document to the 'employees' collection.
   * @param employee The employee data to add (without an id).
   * @returns A promise that resolves with the new document reference.
   */
  addEmployee(employee: Omit<Employee, 'id'>): Promise<any> {
    return addDoc(this.employeesCollection, employee as Employee);
  }

  /**
   * Updates an existing employee document in Firestore.
   * @param id The ID of the employee to update.
   * @param data The partial data to update.
   * @returns A promise that resolves when the update is complete.
   */
  updateEmployee(id: string, data: Partial<Employee>): Promise<void> {
    const docRef = doc(this.employeesCollection, id);
    return updateDoc(docRef, data);
  }

  /**
   * Deletes an employee document from Firestore.
   * @param id The ID of the employee to delete.
   * @returns A promise that resolves when the deletion is complete.
   */
  deleteEmployee(id: string): Promise<void> {
    const docRef = doc(this.employeesCollection, id);
    return deleteDoc(docRef);
  }
}
