const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

export type User = {
  id: number;
  registration: string;
  name: string;
  role: 'admin' | 'user';
  employee_type: 'quadro' | 'terceiro';
};

export type Asset = {
  id: number;
  patrimonio: string;
  type: 'Desktop' | 'Notebook' | 'Monitor';
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  status: 'Disponível' | 'Em uso' | 'Manutenção' | 'Baixado';
  location_id: number;
  location_code: string;
  location: string;
  current_user_id: number | null;
  registration: string | null;
  responsible: string | null;
  notes: string | null;
};

export type Dashboard = {
  total?: number;
  custody?: number;
  available?: number;
  maintenance?: number;
  mine?: number;
  byLocation?: Array<{ id:number; code:string; name:string; total:number }>;
};

function getToken() {
  return localStorage.getItem('ativos-ti-token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Falha na comunicação com o servidor.' }));
    throw new Error(body.error || 'Erro inesperado.');
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  async login(registration: string, password: string) {
    const data = await request<{token:string; user:User}>('/auth/login', {
      method: 'POST', body: JSON.stringify({ registration, password })
    });
    localStorage.setItem('ativos-ti-token', data.token);
    localStorage.setItem('ativos-ti-user', JSON.stringify(data.user));
    return data;
  },
  logout() {
    localStorage.removeItem('ativos-ti-token');
    localStorage.removeItem('ativos-ti-user');
  },
  savedUser(): User | null {
    try { return JSON.parse(localStorage.getItem('ativos-ti-user') || 'null'); } catch { return null; }
  },
  assets(q = '') { return request<Asset[]>(`/assets${q ? `?q=${encodeURIComponent(q)}` : ''}`); },
  dashboard() { return request<Dashboard>('/dashboard'); },
  locations() { return request<Array<{id:number;code:string;name:string}>>('/locations'); },
  users(q='') { return request<User[]>(`/users${q ? `?q=${encodeURIComponent(q)}` : ''}`); },
  createAsset(payload: unknown) { return request<Asset>('/assets', { method:'POST', body:JSON.stringify(payload) }); },
  updateAsset(id:number, payload:unknown) { return request<Asset>(`/assets/${id}`, { method:'PUT', body:JSON.stringify(payload) }); },
  retireAsset(id:number) { return request<void>(`/assets/${id}`, { method:'DELETE' }); },
  assignCustody(id:number, registration:string) { return request<Asset>(`/assets/${id}/custody`, { method:'POST', body:JSON.stringify({ registration }) }); },
  removeCustody(id:number) { return request<Asset>(`/assets/${id}/custody`, { method:'DELETE' }); }
};
