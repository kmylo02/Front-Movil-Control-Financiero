import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MonthlySummary, YearlySummary, MonthComparison } from '../models';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private base = `${environment.apiUrl}/reports`;
  constructor(private http: HttpClient) {}

  getMonthly(year: number, month: number): Observable<MonthlySummary> {
    return this.http.get<MonthlySummary>(`${this.base}/monthly/${year}/${month}`);
  }
  getYearly(year: number): Observable<YearlySummary> {
    return this.http.get<YearlySummary>(`${this.base}/yearly/${year}`);
  }
  compareMonths(year: number, month: number): Observable<MonthComparison> {
    return this.http.get<MonthComparison>(`${this.base}/compare/${year}/${month}`);
  }
  yearComparison(year: number): Observable<any> {
    return this.http.get<any>(`${this.base}/year-comparison/${year}`);
  }
}
