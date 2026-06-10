import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Expense } from '../models';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private base = `${environment.apiUrl}/expenses`;
  constructor(private http: HttpClient) {}

  getAll(year?: number, month?: number): Observable<Expense[]> {
    let params = new HttpParams();
    if (year)  params = params.set('year', year.toString());
    if (month) params = params.set('month', month.toString());
    return this.http.get<Expense[]>(this.base, { params });
  }

  getSummary(year: number, month: number): Observable<any[]> {
    const params = new HttpParams().set('year', year.toString()).set('month', month.toString());
    return this.http.get<any[]>(`${this.base}/summary`, { params });
  }

  create(data: Partial<Expense>): Observable<Expense> { return this.http.post<Expense>(this.base, data); }
  update(id: string, data: Partial<Expense>): Observable<Expense> { return this.http.put<Expense>(`${this.base}/${id}`, data); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}
