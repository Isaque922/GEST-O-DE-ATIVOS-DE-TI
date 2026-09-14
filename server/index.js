import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { requireAdmin, requireAuth, signToken } from './auth.js';
import { extendedRouter } from './extended.js';

const app = express();
const port = Number(process.env.PORT || 3333);
const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin }));
app.use(express.json());
app.use('/api', extendedRouter);

const assetSelect = `
SELECT a.id, a.patrimonio, a.type, a.brand, a.model, a.serial_number, a.status,
       a.location_id, l.code AS location_code, l.name AS location,
       a.current_user_id, u.registration, u.name AS responsible,
       a.notes, a.created_at, a.updated_at
FROM assets a
JOIN locations l ON l.id = a.location_id
LEFT JOIN users u ON u.id = a.current_user_id`;

function writeHistory({ assetId, userId = null, action, locationId = null, performedBy, details = null }) {
  db.prepare(`INSERT INTO custody_history (asset_id,user_id,action,location_id,performed_by,details) VALUES (?,?,?,?,?,?)`)
    .run(assetId, userId, action, locationId, performedBy, details);
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'gestao-ativos-ti' }));

app.post('/api/auth/login', (req, res) => {
  const { registration, password } = req.body || {};
  if (!registration || !password) return res.status(400).json({ error: 'Matrícula e senha são obrigatórias.' });
  const user = db.prepare('SELECT * FROM users WHERE registration = ? AND active = 1').get(String(registration));
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Matrícula ou senha inválida.' });
  const safeUser = { id: user.id, registration: user.registration, name: user.name, role: user.role, employee_type: user.employee_type };
  return res.json({ token: signToken(safeUser), user: safeUser });
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, registration, name, role, employee_type, active, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json(user);
});

app.get('/api/locations', requireAuth, (_req, res) => {
  res.json(db.prepare('SELECT id, code, name FROM locations ORDER BY name').all());
});

app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json(db.prepare('SELECT id, registration, name, role, employee_type, active FROM users ORDER BY name').all());
  const like = `%${q}%`;
  res.json(db.prepare('SELECT id, registration, name, role, employee_type, active FROM users WHERE registration LIKE ? OR name LIKE ? ORDER BY name').all(like, like));
});

app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
  const { registration, name, password, role = 'user', employee_type = 'quadro' } = req.body || {};
  if (!registration || !name || !password) return res.status(400).json({ error: 'Matrícula, nome e senha são obrigatórios.' });
  try {
    const info = db.prepare('INSERT INTO users (registration,name,password_hash,role,employee_type) VALUES (?,?,?,?,?)')
      .run(String(registration), String(name), bcrypt.hashSync(String(password), 10), role, employee_type);
    res.status(201).json(db.prepare('SELECT id, registration, name, role, employee_type, active FROM users WHERE id=?').get(info.lastInsertRowid));
  } catch (error) {
    res.status(400).json({ error: String(error.message).includes('UNIQUE') ? 'Matrícula já cadastrada.' : 'Não foi possível cadastrar o usuário.' });
  }
});

app.get('/api/assets', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim();
  const onlyMine = req.user.role !== 'admin';
  let sql = assetSelect;
  const params = [];
  const filters = [];
  if (onlyMine) { filters.push('a.current_user_id = ?'); params.push(req.user.id); }
  if (q) {
    filters.push('(a.patrimonio LIKE ? OR a.type LIKE ? OR a.model LIKE ? OR l.name LIKE ? OR u.registration LIKE ? OR u.name LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }
  if (filters.length) sql += ` WHERE ${filters.join(' AND ')}`;
  sql += ' ORDER BY a.updated_at DESC, a.id DESC';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/assets/:id', requireAuth, (req, res) => {
  const asset = db.prepare(`${assetSelect} WHERE a.id = ?`).get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Ativo não encontrado.' });
  if (req.user.role !== 'admin' && asset.current_user_id !== req.user.id) return res.status(403).json({ error: 'Este ativo não está sob sua cautela.' });
  res.json(asset);
});

app.post('/api/assets', requireAuth, requireAdmin, (req, res) => {
  const { patrimonio, type, brand = null, model = null, serial_number = null, status = 'Disponível', location_id, notes = null } = req.body || {};
  if (!patrimonio || !type || !location_id) return res.status(400).json({ error: 'Patrimônio, tipo e localidade são obrigatórios.' });
  try {
    const info = db.prepare('INSERT INTO assets (patrimonio,type,brand,model,serial_number,status,location_id,notes) VALUES (?,?,?,?,?,?,?,?)')
      .run(patrimonio, type, brand, model, serial_number, status, location_id, notes);
    writeHistory({ assetId: info.lastInsertRowid, action: 'CRIADO', locationId: location_id, performedBy: req.user.id });
    res.status(201).json(db.prepare(`${assetSelect} WHERE a.id = ?`).get(info.lastInsertRowid));
  } catch (error) {
    res.status(400).json({ error: String(error.message).includes('UNIQUE') ? 'Patrimônio já cadastrado.' : 'Não foi possível cadastrar o ativo.' });
  }
});

app.put('/api/assets/:id', requireAuth, requireAdmin, (req, res) => {
  const current = db.prepare('SELECT * FROM assets WHERE id=?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Ativo não encontrado.' });
  const next = { ...current, ...req.body, updated_at: new Date().toISOString() };
  db.prepare('UPDATE assets SET patrimonio=?, type=?, brand=?, model=?, serial_number=?, status=?, location_id=?, notes=?, updated_at=? WHERE id=?')
    .run(next.patrimonio, next.type, next.brand, next.model, next.serial_number, next.status, next.location_id, next.notes, next.updated_at, current.id);
  writeHistory({ assetId: current.id, userId: current.current_user_id, action: 'ATUALIZADO', locationId: next.location_id, performedBy: req.user.id, details: 'Dados do ativo atualizados.' });
  res.json(db.prepare(`${assetSelect} WHERE a.id = ?`).get(current.id));
});

app.delete('/api/assets/:id', requireAuth, requireAdmin, (req, res) => {
  const asset = db.prepare('SELECT * FROM assets WHERE id=?').get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Ativo não encontrado.' });
  db.prepare("UPDATE assets SET status='Baixado', current_user_id=NULL, updated_at=? WHERE id=?").run(new Date().toISOString(), asset.id);
  writeHistory({ assetId: asset.id, userId: asset.current_user_id, action: 'BAIXADO', locationId: asset.location_id, performedBy: req.user.id, details: 'Baixa patrimonial registrada.' });
  res.status(204).end();
});

app.post('/api/assets/:id/custody', requireAuth, requireAdmin, (req, res) => {
  const { registration } = req.body || {};
  const asset = db.prepare('SELECT * FROM assets WHERE id=?').get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Ativo não encontrado.' });
  const user = db.prepare('SELECT id, registration, name FROM users WHERE registration=? AND active=1').get(String(registration || ''));
  if (!user) return res.status(404).json({ error: 'Colaborador não encontrado.' });
  const action = asset.current_user_id ? 'TRANSFERIDO' : 'VINCULADO';
  db.prepare("UPDATE assets SET current_user_id=?, status='Em uso', updated_at=? WHERE id=?").run(user.id, new Date().toISOString(), asset.id);
  writeHistory({ assetId: asset.id, userId: user.id, action, locationId: asset.location_id, performedBy: req.user.id, details: `Cautela vinculada à matrícula ${user.registration}.` });
  res.json(db.prepare(`${assetSelect} WHERE a.id = ?`).get(asset.id));
});

app.delete('/api/assets/:id/custody', requireAuth, requireAdmin, (req, res) => {
  const asset = db.prepare('SELECT * FROM assets WHERE id=?').get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Ativo não encontrado.' });
  const previousUser = asset.current_user_id;
  db.prepare("UPDATE assets SET current_user_id=NULL, status='Disponível', updated_at=? WHERE id=?").run(new Date().toISOString(), asset.id);
  writeHistory({ assetId: asset.id, userId: previousUser, action: 'DESVINCULADO', locationId: asset.location_id, performedBy: req.user.id, details: 'Cautela encerrada.' });
  res.json(db.prepare(`${assetSelect} WHERE a.id = ?`).get(asset.id));
});

app.get('/api/assets/:id/history', requireAuth, requireAdmin, (req, res) => {
  res.json(db.prepare(`SELECT h.*, u.name AS user_name, u.registration, p.name AS performed_by_name, l.name AS location
    FROM custody_history h LEFT JOIN users u ON u.id=h.user_id JOIN users p ON p.id=h.performed_by LEFT JOIN locations l ON l.id=h.location_id
    WHERE h.asset_id=? ORDER BY h.created_at DESC, h.id DESC`).all(req.params.id));
});

app.get('/api/dashboard', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    const mine = db.prepare("SELECT COUNT(*) AS total FROM assets WHERE current_user_id=? AND status <> 'Baixado'").get(req.user.id).total;
    return res.json({ mine });
  }
  const totals = db.prepare(`SELECT
    SUM(CASE WHEN status <> 'Baixado' THEN 1 ELSE 0 END) AS total,
    SUM(CASE WHEN current_user_id IS NOT NULL AND status <> 'Baixado' THEN 1 ELSE 0 END) AS custody,
    SUM(CASE WHEN status='Disponível' THEN 1 ELSE 0 END) AS available,
    SUM(CASE WHEN status='Manutenção' THEN 1 ELSE 0 END) AS maintenance
    FROM assets`).get();
  const byLocation = db.prepare("SELECT l.id,l.code,l.name,COUNT(a.id) AS total FROM locations l LEFT JOIN assets a ON a.location_id=l.id AND a.status<>'Baixado' GROUP BY l.id ORDER BY total DESC").all();
  res.json({ ...totals, byLocation });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(port, () => console.log(`API Gestão de Ativos TI em http://localhost:${port}`));
