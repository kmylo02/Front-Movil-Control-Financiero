import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Budget } from '../models';

@Injectable({ providedIn: 'root' })
export class BudgetsService {
  private base = `${environment.apiUrl}/budgets`;
  constructor(private http: HttpClient) {}

  upsert(data: Partial<Budget>): Observable<Budget> { return this.http.post<Budget>(this.base, data); }
  getByMonth(year: number, month: number): Observable<Budget> { return this.http.get<Budget>(`${this.base}/${year}/${month}`); }
  getByYear(year: number): Observable<Budget[]> { return this.http.get<Budget[]>(`${this.base}/${year}`); }
  delete(year: number, month: number): Observable<void> { return this.http.delete<void>(`${this.base}/${year}/${month}`); }
}
