import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { initializeDatabase, many, one, query } from './db.js';
import { requireAdmin, requireAuth, signToken } from './auth.js';
import { extendedRouter } from './extended.js';

const app = express();
const port = Number(process.env.PORT || 3333);
const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

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

async function writeHistory({ assetId, userId = null, action, locationId = null, performedBy, details = null }) {
  await query(`INSERT INTO custody_history (asset_id,user_id,action,location_id,performed_by,details)
    VALUES ($1,$2,$3,$4,$5,$6)`, [assetId, userId, action, locationId, performedBy, details]);
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'gestao-ativos-ti', database: 'postgresql' }));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { registration, password } = req.body || {};
  if (!registration || !password) return res.status(400).json({ error: 'Matrícula e senha são obrigatórias.' });
  const user = await one('SELECT * FROM users WHERE registration = $1 AND active = TRUE', [String(registration)]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Matrícula ou senha inválida.' });
  const safeUser = { id: user.id, registration: user.registration, name: user.name, role: user.role, employee_type: user.employee_type };
  return res.json({ token: signToken(safeUser), user: safeUser });
}));

app.get('/api/me', requireAuth, asyncRoute(async (req, res) => {
  const user = await one('SELECT id, registration, name, role, employee_type, active, created_at FROM users WHERE id = $1', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json(user);
}));

app.get('/api/locations', requireAuth, asyncRoute(async (_req, res) => {
  res.json(await many('SELECT id, code, name FROM locations ORDER BY name'));
}));

app.get('/api/users', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json(await many('SELECT id, registration, name, role, employee_type, active FROM users ORDER BY name'));
  const like = `%${q}%`;
  res.json(await many('SELECT id, registration, name, role, employee_type, active FROM users WHERE registration ILIKE $1 OR name ILIKE $1 ORDER BY name', [like]));
}));

app.post('/api/users', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const { registration, name, password, role = 'user', employee_type = 'quadro' } = req.body || {};
  if (!registration || !name || !password) return res.status(400).json({ error: 'Matrícula, nome e senha são obrigatórios.' });
  try {
    const created = await one(`INSERT INTO users (registration,name,password_hash,role,employee_type)
      VALUES ($1,$2,$3,$4,$5) RETURNING id,registration,name,role,employee_type,active`,
      [String(registration), String(name), bcrypt.hashSync(String(password), 10), role, employee_type]);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.code === '23505' ? 'Matrícula já cadastrada.' : 'Não foi possível cadastrar o usuário.' });
  }
}));

app.get('/api/assets', requireAuth, asyncRoute(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filters = [];
  const params = [];
  if (req.user.role !== 'admin') { params.push(req.user.id); filters.push(`a.current_user_id = $${params.length}`); }
  if (q) {
    params.push(`%${q}%`);
    const p = `$${params.length}`;
    filters.push(`(a.patrimonio ILIKE ${p} OR a.type ILIKE ${p} OR a.model ILIKE ${p} OR l.name ILIKE ${p} OR u.registration ILIKE ${p} OR u.name ILIKE ${p})`);
  }
  const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
  res.json(await many(`${assetSelect}${where} ORDER BY a.updated_at DESC, a.id DESC`, params));
}));

app.get('/api/assets/:id', requireAuth, asyncRoute(async (req, res) => {
  const asset = await one(`${assetSelect} WHERE a.id = $1`, [req.params.id]);
  if (!asset) return res.status(404).json({ error: 'Ativo não encontrado.' });
  if (req.user.role !== 'admin' && String(asset.current_user_id) !== String(req.user.id)) return res.status(403).json({ error: 'Este ativo não está sob sua cautela.' });
  res.json(asset);
}));

app.post('/api/assets', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const { patrimonio, type, brand = null, model = null, serial_number = null, status = 'Disponível', location_id, notes = null } = req.body || {};
  if (!patrimonio || !type || !location_id) return res.status(400).json({ error: 'Patrimônio, tipo e localidade são obrigatórios.' });
  try {
    const created = await one(`INSERT INTO assets (patrimonio,type,brand,model,serial_number,status,location_id,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [patrimonio, type, brand, model, serial_number, status, location_id, notes]);
    await writeHistory({ assetId: created.id, action: 'CRIADO', locationId: location_id, performedBy: req.user.id });
    res.status(201).json(await one(`${assetSelect} WHERE a.id = $1`, [created.id]));
  } catch (error) {
    res.status(400).json({ error: error.code === '23505' ? 'Patrimônio já cadastrado.' : 'Não foi possível cadastrar o ativo.' });
  }
}));

app.put('/api/assets/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const current = await one('SELECT * FROM assets WHERE id=$1', [req.params.id]);
  if (!current) return res.status(404).json({ error: 'Ativo não encontrado.' });
  const next = { ...current, ...req.body };
  await query(`UPDATE assets SET patrimonio=$1,type=$2,brand=$3,model=$4,serial_number=$5,status=$6,location_id=$7,notes=$8,updated_at=CURRENT_TIMESTAMP WHERE id=$9`,
    [next.patrimonio,next.type,next.brand,next.model,next.serial_number,next.status,next.location_id,next.notes,current.id]);
  await writeHistory({ assetId: current.id, userId: current.current_user_id, action: 'ATUALIZADO', locationId: next.location_id, performedBy: req.user.id, details: 'Dados do ativo atualizados.' });
  res.json(await one(`${assetSelect} WHERE a.id = $1`, [current.id]));
}));

app.delete('/api/assets/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const asset = await one('SELECT * FROM assets WHERE id=$1', [req.params.id]);
  if (!asset) return res.status(404).json({ error: 'Ativo não encontrado.' });
  await query("UPDATE assets SET status='Baixado',current_user_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=$1", [asset.id]);
  await writeHistory({ assetId: asset.id, userId: asset.current_user_id, action: 'BAIXADO', locationId: asset.location_id, performedBy: req.user.id, details: 'Baixa patrimonial registrada.' });
  res.status(204).end();
}));

app.post('/api/assets/:id/custody', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const asset = await one('SELECT * FROM assets WHERE id=$1', [req.params.id]);
  if (!asset) return res.status(404).json({ error: 'Ativo não encontrado.' });
  const user = await one('SELECT id,registration,name FROM users WHERE registration=$1 AND active=TRUE', [String(req.body?.registration || '')]);
  if (!user) return res.status(404).json({ error: 'Colaborador não encontrado.' });
  const action = asset.current_user_id ? 'TRANSFERIDO' : 'VINCULADO';
  await query("UPDATE assets SET current_user_id=$1,status='Em uso',updated_at=CURRENT_TIMESTAMP WHERE id=$2", [user.id, asset.id]);
  await writeHistory({ assetId: asset.id, userId: user.id, action, locationId: asset.location_id, performedBy: req.user.id, details: `Cautela vinculada à matrícula ${user.registration}.` });
  res.json(await one(`${assetSelect} WHERE a.id = $1`, [asset.id]));
}));

app.delete('/api/assets/:id/custody', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const asset = await one('SELECT * FROM assets WHERE id=$1', [req.params.id]);
  if (!asset) return res.status(404).json({ error: 'Ativo não encontrado.' });
  await query("UPDATE assets SET current_user_id=NULL,status='Disponível',updated_at=CURRENT_TIMESTAMP WHERE id=$1", [asset.id]);
  await writeHistory({ assetId: asset.id, userId: asset.current_user_id, action: 'DESVINCULADO', locationId: asset.location_id, performedBy: req.user.id, details: 'Cautela encerrada.' });
  res.json(await one(`${assetSelect} WHERE a.id = $1`, [asset.id]));
}));

app.get('/api/assets/:id/history', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  res.json(await many(`SELECT h.*,u.name AS user_name,u.registration,p.name AS performed_by_name,l.name AS location
    FROM custody_history h LEFT JOIN users u ON u.id=h.user_id JOIN users p ON p.id=h.performed_by LEFT JOIN locations l ON l.id=h.location_id
    WHERE h.asset_id=$1 ORDER BY h.created_at DESC,h.id DESC`, [req.params.id]));
}));

app.get('/api/dashboard', requireAuth, asyncRoute(async (req, res) => {
  if (req.user.role !== 'admin') {
    const mine = await one("SELECT COUNT(*)::int AS total FROM assets WHERE current_user_id=$1 AND status<>'Baixado'", [req.user.id]);
    return res.json({ mine: mine.total });
  }
  const totals = await one(`SELECT
    COUNT(*) FILTER (WHERE status<>'Baixado')::int AS total,
    COUNT(*) FILTER (WHERE current_user_id IS NOT NULL AND status<>'Baixado')::int AS custody,
    COUNT(*) FILTER (WHERE status='Disponível')::int AS available,
    COUNT(*) FILTER (WHERE status='Manutenção')::int AS maintenance FROM assets`);
  const byLocation = await many("SELECT l.id,l.code,l.name,COUNT(a.id)::int AS total FROM locations l LEFT JOIN assets a ON a.location_id=l.id AND a.status<>'Baixado' GROUP BY l.id ORDER BY total DESC");
  res.json({ ...totals, byLocation });
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

await initializeDatabase();
app.listen(port, '0.0.0.0', () => console.log(`API Gestão de Ativos TI na porta ${port}`));
