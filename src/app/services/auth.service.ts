import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

@Injectable({
  providedIn: 'root' 
})
export class AuthService {
  private http = inject(HttpClient);

  constructor() {}

  login(userData: { email: string, password: string }) {
    return this.http.post<any>('http://localhost:3000/api/login', userData);
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  register(userData: { name: string, email: string, password: string }) {
    return this.http.post<any>('http://localhost:3000/api/register', userData);
  }
  
  getToken() {
    return localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
  }
}
