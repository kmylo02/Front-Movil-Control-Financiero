import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BillItem } from '../models';

@Injectable({ providedIn: 'root' })
export class BillItemsService {
  private base = `${environment.apiUrl}/bill-items`;
  constructor(private http: HttpClient) {}

  getByMonth(year: number, month: number): Observable<BillItem[]> {
    return this.http.get<BillItem[]>(this.base, {
      params: { year: year.toString(), month: month.toString() },
    });
  }

  create(data: Partial<BillItem>): Observable<BillItem> {
    return this.http.post<BillItem>(this.base, data);
  }

  update(id: string, data: Partial<BillItem>): Observable<BillItem> {
    return this.http.put<BillItem>(`${this.base}/${id}`, data);
  }

  toggle(id: string): Observable<BillItem> {
    return this.http.patch<BillItem>(`${this.base}/${id}/toggle`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  copyToNextMonth(year: number, month: number): Observable<any> {
    return this.http.post(`${this.base}/copy-next-month`, { year, month });
  }
}
