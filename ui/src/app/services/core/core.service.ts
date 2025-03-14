import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface AppConfig {
  key: string;
  host: string;
}

const APP_CONFIG_ENDPOINT = 'app/config';

@Injectable({
  providedIn: 'root',
})
export class CoreService {
  constructor(private http: HttpClient) {}

  getAppConfig() {
    const headers = new HttpHeaders({
      skipLoader: 'true',
    });
    return this.http.get<AppConfig>(APP_CONFIG_ENDPOINT, { headers });
  }
}
