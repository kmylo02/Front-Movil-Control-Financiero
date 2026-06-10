import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Income } from '../models';

@Injectable({ providedIn: 'root' })
export class IncomesService {
  private base = `${environment.apiUrl}/incomes`;
  constructor(private http: HttpClient) {}

  getAll(year?: number, month?: number): Observable<Income[]> {
    let params = new HttpParams();
    if (year)  params = params.set('year', year.toString());
    if (month) params = params.set('month', month.toString());
    return this.http.get<Income[]>(this.base, { params });
  }

  create(data: Partial<Income>): Observable<Income> { return this.http.post<Income>(this.base, data); }
  update(id: string, data: Partial<Income>): Observable<Income> { return this.http.put<Income>(`${this.base}/${id}`, data); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}
