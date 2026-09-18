import express from 'express';
import bcrypt from 'bcryptjs';
import { many, one, query } from './db.js';
import { requireAuth, requireAdmin } from './auth.js';

export const extendedRouter = express.Router();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

extendedRouter.get('/settings', asyncRoute(async (_req, res) => {
  res.json(await one('SELECT app_name,app_subtitle,accent_color,sidebar_color,updated_at FROM app_settings WHERE id=1'));
}));

extendedRouter.put('/settings', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const appName = String(req.body?.app_name || '').trim();
  const appSubtitle = String(req.body?.app_subtitle || '').trim();
  const accentColor = String(req.body?.accent_color || '');
  const sidebarColor = String(req.body?.sidebar_color || '');
  const hex = /^#[0-9a-fA-F]{6}$/;
  if (!appName || appName.length > 40 || !appSubtitle || appSubtitle.length > 60) return res.status(400).json({ error: 'Informe nome e subtítulo dentro dos limites permitidos.' });
  if (!hex.test(accentColor) || !hex.test(sidebarColor)) return res.status(400).json({ error: 'As cores devem estar no formato hexadecimal.' });
  const updated = await one(`UPDATE app_settings SET app_name=$1,app_subtitle=$2,accent_color=$3,sidebar_color=$4,updated_at=CURRENT_TIMESTAMP WHERE id=1
    RETURNING app_name,app_subtitle,accent_color,sidebar_color,updated_at`, [appName, appSubtitle, accentColor.toLowerCase(), sidebarColor.toLowerCase()]);
  res.json(updated);
}));

extendedRouter.get('/users/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const user = await one('SELECT id,registration,name,role,employee_type,active,created_at FROM users WHERE id=$1', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Colaborador não encontrado.' });
  const assets = await many(`SELECT a.id,a.patrimonio,a.type,a.brand,a.model,a.status,l.name AS location FROM assets a
    JOIN locations l ON l.id=a.location_id WHERE a.current_user_id=$1 AND a.status<>'Baixado' ORDER BY a.patrimonio`, [req.params.id]);
  res.json({ ...user, assets });
}));

extendedRouter.put('/users/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const current = await one('SELECT * FROM users WHERE id=$1', [req.params.id]);
  if (!current) return res.status(404).json({ error: 'Colaborador não encontrado.' });
  const { name=current.name, role=current.role, employee_type=current.employee_type, active=current.active } = req.body || {};
  const updated = await one(`UPDATE users SET name=$1,role=$2,employee_type=$3,active=$4 WHERE id=$5
    RETURNING id,registration,name,role,employee_type,active`, [name,role,employee_type,Boolean(active),current.id]);
  res.json(updated);
}));

extendedRouter.put('/users/:id/password', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const password = String(req.body?.password || '');
  if (password.length < 12) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 12 caracteres.' });
  const user = await one('SELECT id FROM users WHERE id=$1', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Colaborador não encontrado.' });
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [bcrypt.hashSync(password, 12), user.id]);
  res.status(204).end();
}));

extendedRouter.get('/custodies', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const like = `%${q}%`;
  res.json(await many(`SELECT a.id AS asset_id,a.patrimonio,a.type,a.brand,a.model,a.status,l.name AS location,u.id AS user_id,u.registration,u.name AS responsible,u.employee_type,a.updated_at
    FROM assets a JOIN locations l ON l.id=a.location_id JOIN users u ON u.id=a.current_user_id
    WHERE a.status<>'Baixado' AND ($1='' OR a.patrimonio ILIKE $2 OR u.registration ILIKE $2 OR u.name ILIKE $2)
    ORDER BY u.name,a.patrimonio`, [q, like]));
}));

extendedRouter.get('/history', requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await many(`SELECT h.id,h.asset_id,a.patrimonio,a.type,h.action,h.details,h.created_at,
    u.name AS user_name,u.registration,p.name AS performed_by_name,l.name AS location
    FROM custody_history h JOIN assets a ON a.id=h.asset_id LEFT JOIN users u ON u.id=h.user_id
    JOIN users p ON p.id=h.performed_by LEFT JOIN locations l ON l.id=h.location_id
    ORDER BY h.created_at DESC,h.id DESC LIMIT 200`));
}));

extendedRouter.get('/maintenance', requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await many(`SELECT m.*,a.patrimonio,a.type,a.brand,a.model,l.name AS location,u.name AS created_by_name
    FROM maintenance m JOIN assets a ON a.id=m.asset_id JOIN locations l ON l.id=a.location_id JOIN users u ON u.id=m.created_by
    ORDER BY CASE m.status WHEN 'Aberta' THEN 1 WHEN 'Em andamento' THEN 2 ELSE 3 END,m.opened_at DESC`));
}));

extendedRouter.post('/maintenance', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const { asset_id, description, provider=null, notes=null } = req.body || {};
  if (!asset_id || !description) return res.status(400).json({ error: 'Ativo e descrição são obrigatórios.' });
  const asset = await one('SELECT * FROM assets WHERE id=$1', [asset_id]);
  if (!asset || asset.status==='Baixado') return res.status(404).json({ error: 'Ativo disponível para manutenção não encontrado.' });
  const created = await one(`INSERT INTO maintenance (asset_id,description,provider,created_by,notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [asset_id,description,provider,req.user.id,notes]);
  await query("UPDATE assets SET status='Manutenção',updated_at=CURRENT_TIMESTAMP WHERE id=$1", [asset_id]);
  res.status(201).json(created);
}));

extendedRouter.put('/maintenance/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const current = await one('SELECT * FROM maintenance WHERE id=$1', [req.params.id]);
  if (!current) return res.status(404).json({ error: 'Manutenção não encontrada.' });
  const { status=current.status, description=current.description, provider=current.provider, notes=current.notes } = req.body || {};
  const closedAt = status==='Concluída' ? (current.closed_at || new Date()) : null;
  const updated = await one(`UPDATE maintenance SET status=$1,description=$2,provider=$3,notes=$4,closed_at=$5 WHERE id=$6 RETURNING *`,
    [status,description,provider,notes,closedAt,current.id]);
  if (status==='Concluída') await query("UPDATE assets SET status=CASE WHEN current_user_id IS NULL THEN 'Disponível' ELSE 'Em uso' END,updated_at=CURRENT_TIMESTAMP WHERE id=$1", [current.asset_id]);
  res.json(updated);
}));

extendedRouter.get('/reports/summary', requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
  const [byType, byStatus, employees] = await Promise.all([
    many("SELECT type,COUNT(*)::int AS total FROM assets WHERE status<>'Baixado' GROUP BY type ORDER BY total DESC"),
    many('SELECT status,COUNT(*)::int AS total FROM assets GROUP BY status ORDER BY total DESC'),
    many("SELECT employee_type,COUNT(*)::int AS total FROM users WHERE role='user' AND active=TRUE GROUP BY employee_type")
  ]);
  res.json({ byType, byStatus, employees });
}));
