import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AHPWeights } from '../models/app.types';

@Injectable({
  providedIn: 'root',
})
export class AhpService {
  private firestore: Firestore = inject(Firestore);

  private ahpWeightsCollection = collection(this.firestore, 'ahp-weights');

  /**
   * Retrieves all saved AHP weights from Firestore as an observable.
   * @returns An observable of the AHPWeights array.
   */
  getSavedWeights(): Observable<AHPWeights[]> {
    return collectionData(this.ahpWeightsCollection, {
      idField: 'id',
    }) as Observable<AHPWeights[]>;
  }

  /**
   * Adds a new AHP weights document to the collection.
   * @param weights The AHP weights object to save.
   * @returns A promise that resolves when the document is added.
   */
  addWeights(weights: Omit<AHPWeights, 'id'>): Promise<any> {
    return addDoc(this.ahpWeightsCollection, weights as AHPWeights);
  }

  /**
   * Deletes a saved AHP weights document from Firestore.
   * @param id The ID of the document to delete.
   * @returns A promise that resolves when the deletion is complete.
   */
  deleteWeights(id: string): Promise<void> {
    const docRef = doc(this.ahpWeightsCollection, id);
    return deleteDoc(docRef);
  }

  /**
   * Activates a specific set of weights, deactivating all others.
   * This is done in a transaction to ensure atomicity.
   * @param idToActivate The ID of the weights document to activate.
   * @returns A promise that resolves when the transaction is complete.
   */
  async activateWeights(idToActivate: string): Promise<void> {
    const batch = writeBatch(this.firestore);

    const querySnapshot = await getDocs(this.ahpWeightsCollection);

    querySnapshot.forEach((document) => {
      const docRef = doc(this.ahpWeightsCollection, document.id);
      batch.update(docRef, { isActive: document.id === idToActivate });
    });

    return batch.commit();
  }
}
