import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Recurring } from '../models';

@Injectable({ providedIn: 'root' })
export class RecurringService {
  private base = `${environment.apiUrl}/recurring`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<Recurring[]> { return this.http.get<Recurring[]>(this.base); }
  getPending(): Observable<Recurring[]> { return this.http.get<Recurring[]>(`${this.base}/pending`); }
  create(data: Partial<Recurring>): Observable<Recurring> { return this.http.post<Recurring>(this.base, data); }
  update(id: string, data: Partial<Recurring>): Observable<Recurring> { return this.http.put<Recurring>(`${this.base}/${id}`, data); }
  activate(id: string, amount?: number): Observable<any> { return this.http.post(`${this.base}/${id}/activate`, { amount }); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}
