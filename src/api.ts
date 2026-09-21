const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3333/api');

export type User = { id:number; registration:string; name:string; role:'admin'|'user'; employee_type:'quadro'|'terceiro'; active?:number|boolean };
export type Location = { id:number; code:string; name:string };
export type Asset = { id:number; patrimonio:string; type:'Desktop'|'Notebook'|'Monitor'; brand:string|null; model:string|null; serial_number:string|null; status:'Disponível'|'Em uso'|'Manutenção'|'Baixado'; location_id:number; location_code:string; location:string; current_user_id:number|null; registration:string|null; responsible:string|null; notes:string|null; created_at?:string; updated_at?:string };
export type Dashboard = { total?:number; custody?:number; available?:number; maintenance?:number; mine?:number; byLocation?:Array<{id:number;code:string;name:string;total:number}> };
export type Custody = { asset_id:number; patrimonio:string; type:string; brand:string|null; model:string|null; status:string; location:string; user_id:number; registration:string; responsible:string; employee_type:string; updated_at:string };
export type History = { id:number; asset_id:number; patrimonio:string; type:string; action:string; details:string|null; created_at:string; user_name:string|null; registration:string|null; performed_by_name:string; location:string|null };
export type Maintenance = { id:number; asset_id:number; patrimonio:string; type:string; brand:string|null; model:string|null; location:string; description:string; provider:string|null; opened_at:string; closed_at:string|null; status:'Aberta'|'Em andamento'|'Concluída'; notes:string|null; created_by_name:string };
export type AppSettings = { app_name:string; app_subtitle:string; accent_color:string; sidebar_color:string; updated_at?:string };

function getToken(){ return localStorage.getItem('ativos-ti-token'); }
async function request<T>(path:string, options:RequestInit={}):Promise<T>{
  const headers=new Headers(options.headers||{}); headers.set('Content-Type','application/json'); const token=getToken(); if(token) headers.set('Authorization',`Bearer ${token}`);
  const response=await fetch(`${API_URL}${path}`,{...options,headers});
  if(!response.ok){ const body=await response.json().catch(()=>({error:'Falha na comunicação com o servidor.'})); throw new Error(body.error||'Erro inesperado.'); }
  if(response.status===204) return undefined as T; return response.json();
}

export const api={
  settings:()=>request<AppSettings>('/settings'),
  updateSettings:(payload:AppSettings)=>request<AppSettings>('/settings',{method:'PUT',body:JSON.stringify(payload)}),
  async login(registration:string,password:string){ const data=await request<{token:string;user:User}>('/auth/login',{method:'POST',body:JSON.stringify({registration,password})}); localStorage.setItem('ativos-ti-token',data.token); localStorage.setItem('ativos-ti-user',JSON.stringify(data.user)); return data; },
  logout(){ localStorage.removeItem('ativos-ti-token'); localStorage.removeItem('ativos-ti-user'); },
  savedUser():User|null{ try{return JSON.parse(localStorage.getItem('ativos-ti-user')||'null')}catch{return null} },
  dashboard:()=>request<Dashboard>('/dashboard'),
  locations:()=>request<Location[]>('/locations'),
  createLocation:(payload:{code:string;name:string})=>request<Location>('/locations',{method:'POST',body:JSON.stringify(payload)}),
  assets:(q='')=>request<Asset[]>(`/assets${q?`?q=${encodeURIComponent(q)}`:''}`),
  asset:(id:number)=>request<Asset>(`/assets/${id}`),
  createAsset:(payload:unknown)=>request<Asset>('/assets',{method:'POST',body:JSON.stringify(payload)}),
  updateAsset:(id:number,payload:unknown)=>request<Asset>(`/assets/${id}`,{method:'PUT',body:JSON.stringify(payload)}),
  retireAsset:(id:number)=>request<void>(`/assets/${id}`,{method:'DELETE'}),
  assignCustody:(id:number,registration:string)=>request<Asset>(`/assets/${id}/custody`,{method:'POST',body:JSON.stringify({registration})}),
  removeCustody:(id:number)=>request<Asset>(`/assets/${id}/custody`,{method:'DELETE'}),
  assetHistory:(id:number)=>request<History[]>(`/assets/${id}/history`),
  users:(q='')=>request<User[]>(`/users${q?`?q=${encodeURIComponent(q)}`:''}`),
  createUser:(payload:unknown)=>request<User>('/users',{method:'POST',body:JSON.stringify(payload)}),
  updateUser:(id:number,payload:unknown)=>request<User>(`/users/${id}`,{method:'PUT',body:JSON.stringify(payload)}),
  updateUserPassword:(id:number,password:string)=>request<void>(`/users/${id}/password`,{method:'PUT',body:JSON.stringify({password})}),
  changePassword:(current_password:string,new_password:string)=>request<void>('/me/password',{method:'PUT',body:JSON.stringify({current_password,new_password})}),
  custodies:(q='')=>request<Custody[]>(`/custodies${q?`?q=${encodeURIComponent(q)}`:''}`),
  history:()=>request<History[]>('/history'),
  maintenance:()=>request<Maintenance[]>('/maintenance'),
  createMaintenance:(payload:unknown)=>request<Maintenance>('/maintenance',{method:'POST',body:JSON.stringify(payload)}),
  updateMaintenance:(id:number,payload:unknown)=>request<Maintenance>(`/maintenance/${id}`,{method:'PUT',body:JSON.stringify(payload)}),
};
