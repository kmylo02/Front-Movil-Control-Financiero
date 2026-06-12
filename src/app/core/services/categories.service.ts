import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category } from '../models';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private base = `${environment.apiUrl}/categories`;
  constructor(private http: HttpClient) {}

  getAll(type?: string): Observable<Category[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<Category[]>(this.base, { params });
  }
  create(data: Partial<Category>): Observable<Category> { return this.http.post<Category>(this.base, data); }
  update(id: string, data: Partial<Category>): Observable<Category> { return this.http.put<Category>(`${this.base}/${id}`, data); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}
