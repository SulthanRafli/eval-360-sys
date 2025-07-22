import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  query,
  orderBy,
  limit,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Activity } from '../models/app.types';

@Injectable({
  providedIn: 'root',
})
export class RecentActivitiesService {
  private firestore: Firestore = inject(Firestore);

  private activitiesCollection = collection(
    this.firestore,
    'recent-activities'
  );

  /**
   * Mengambil 10 aktivitas terbaru dari Firestore.
   * @returns Observable dari array Activity.
   */
  getRecentActivities(): Observable<Activity[]> {
    const q = query(
      this.activitiesCollection,
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    return collectionData(q) as Observable<Activity[]>;
  }

  /**
   * Menambahkan entri log aktivitas baru ke Firestore.
   * @param message Pesan yang menjelaskan aktivitas.
   * @param user Nama pengguna yang melakukan aksi.
   * @param icon Objek ikon dari lucide-angular.
   * @param color Kode warna untuk ikon.
   */
  addActivity(
    message: string,
    user: string,
    icon: string,
    color: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  ): Promise<any> {
    const newActivity: Omit<Activity, 'id'> = {
      message,
      user,
      icon,
      color,
      timestamp: new Date(),
    };
    return addDoc(this.activitiesCollection, newActivity);
  }
}
