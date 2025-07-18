import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Criteria } from '../models/app.types';

@Injectable({
  providedIn: 'root',
})
export class CriteriaService {
  private firestore = inject(Firestore);
  private criteriaCollection = collection(this.firestore, 'criteria');

  getCriteria(): Observable<Criteria[]> {
    return collectionData(this.criteriaCollection, {
      idField: 'id',
    }).pipe((map) => {
      console.log(map);
      return map;
    }) as Observable<Criteria[]>;
  }

  addCriteria(body: any): Promise<void> {
    return addDoc(this.criteriaCollection, body).then(() => {});
  }

  deleteCriteria(id: string): Promise<void> {
    const criteriaDoc = doc(this.firestore, 'criteria', id);
    return deleteDoc(criteriaDoc);
  }

  updateCriteria(id: string, body: any): Promise<void> {
    const criteriaDoc = doc(this.firestore, 'criteria', id);
    return updateDoc(criteriaDoc, body);
  }
}
