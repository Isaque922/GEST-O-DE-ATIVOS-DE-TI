import express from 'express';
import { db } from './db.js';
import { requireAuth, requireAdmin } from './auth.js';

export const extendedRouter = express.Router();

db.exec(`
CREATE TABLE IF NOT EXISTS maintenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  description TEXT NOT NULL,
  provider TEXT,
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,
  status TEXT NOT NULL DEFAULT 'Aberta' CHECK(status IN ('Aberta','Em andamento','Concluída')),
  created_by INTEGER NOT NULL REFERENCES users(id),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status);
`);

extendedRouter.get('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const user = db.prepare('SELECT id, registration, name, role, employee_type, active, created_at FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Colaborador não encontrado.' });
  const assets = db.prepare(`SELECT a.id,a.patrimonio,a.type,a.brand,a.model,a.status,l.name AS location FROM assets a JOIN locations l ON l.id=a.location_id WHERE a.current_user_id=? AND a.status<>'Baixado' ORDER BY a.patrimonio`).all(req.params.id);
  res.json({ ...user, assets });
});

extendedRouter.put('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const current = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Colaborador não encontrado.' });
  const { name=current.name, role=current.role, employee_type=current.employee_type, active=current.active } = req.body || {};
  db.prepare('UPDATE users SET name=?, role=?, employee_type=?, active=? WHERE id=?').run(name, role, employee_type, active ? 1 : 0, current.id);
  res.json(db.prepare('SELECT id,registration,name,role,employee_type,active FROM users WHERE id=?').get(current.id));
});

extendedRouter.get('/custodies', requireAuth, requireAdmin, (req, res) => {
  const q = String(req.query.q || '').trim();
  const like = `%${q}%`;
  const sql = `SELECT a.id AS asset_id,a.patrimonio,a.type,a.brand,a.model,a.status,l.name AS location,u.id AS user_id,u.registration,u.name AS responsible,u.employee_type,a.updated_at
    FROM assets a JOIN locations l ON l.id=a.location_id JOIN users u ON u.id=a.current_user_id
    WHERE a.status<>'Baixado' AND (?='' OR a.patrimonio LIKE ? OR u.registration LIKE ? OR u.name LIKE ?)
    ORDER BY u.name,a.patrimonio`;
  res.json(db.prepare(sql).all(q, like, like, like));
});

extendedRouter.get('/history', requireAuth, requireAdmin, (_req, res) => {
  const rows = db.prepare(`SELECT h.id,h.asset_id,a.patrimonio,a.type,h.action,h.details,h.created_at,
    u.name AS user_name,u.registration,p.name AS performed_by_name,l.name AS location
    FROM custody_history h JOIN assets a ON a.id=h.asset_id LEFT JOIN users u ON u.id=h.user_id
    JOIN users p ON p.id=h.performed_by LEFT JOIN locations l ON l.id=h.location_id
    ORDER BY h.created_at DESC,h.id DESC LIMIT 200`).all();
  res.json(rows);
});

extendedRouter.get('/maintenance', requireAuth, requireAdmin, (_req, res) => {
  const rows = db.prepare(`SELECT m.*,a.patrimonio,a.type,a.brand,a.model,l.name AS location,u.name AS created_by_name
    FROM maintenance m JOIN assets a ON a.id=m.asset_id JOIN locations l ON l.id=a.location_id JOIN users u ON u.id=m.created_by
    ORDER BY CASE m.status WHEN 'Aberta' THEN 1 WHEN 'Em andamento' THEN 2 ELSE 3 END,m.opened_at DESC`).all();
  res.json(rows);
});

extendedRouter.post('/maintenance', requireAuth, requireAdmin, (req, res) => {
  const { asset_id, description, provider=null, notes=null } = req.body || {};
  if (!asset_id || !description) return res.status(400).json({ error: 'Ativo e descrição são obrigatórios.' });
  const asset = db.prepare('SELECT * FROM assets WHERE id=?').get(asset_id);
  if (!asset || asset.status==='Baixado') return res.status(404).json({ error: 'Ativo disponível para manutenção não encontrado.' });
  const info = db.prepare('INSERT INTO maintenance (asset_id,description,provider,created_by,notes) VALUES (?,?,?,?,?)').run(asset_id,description,provider,req.user.id,notes);
  db.prepare(`UPDATE assets SET status='Manutenção',updated_at=? WHERE id=?`).run(new Date().toISOString(), asset_id);
  res.status(201).json(db.prepare('SELECT * FROM maintenance WHERE id=?').get(info.lastInsertRowid));
});

extendedRouter.put('/maintenance/:id', requireAuth, requireAdmin, (req, res) => {
  const current = db.prepare('SELECT * FROM maintenance WHERE id=?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Manutenção não encontrada.' });
  const { status=current.status, description=current.description, provider=current.provider, notes=current.notes } = req.body || {};
  const closedAt = status==='Concluída' ? (current.closed_at || new Date().toISOString()) : null;
  db.prepare('UPDATE maintenance SET status=?,description=?,provider=?,notes=?,closed_at=? WHERE id=?').run(status,description,provider,notes,closedAt,current.id);
  if (status==='Concluída') db.prepare(`UPDATE assets SET status=CASE WHEN current_user_id IS NULL THEN 'Disponível' ELSE 'Em uso' END,updated_at=? WHERE id=?`).run(new Date().toISOString(), current.asset_id);
  res.json(db.prepare('SELECT * FROM maintenance WHERE id=?').get(current.id));
});

extendedRouter.get('/reports/summary', requireAuth, requireAdmin, (_req, res) => {
  const byType = db.prepare(`SELECT type,COUNT(*) AS total FROM assets WHERE status<>'Baixado' GROUP BY type ORDER BY total DESC`).all();
  const byStatus = db.prepare(`SELECT status,COUNT(*) AS total FROM assets GROUP BY status ORDER BY total DESC`).all();
  const employees = db.prepare(`SELECT employee_type,COUNT(*) AS total FROM users WHERE role='user' AND active=1 GROUP BY employee_type`).all();
  res.json({ byType, byStatus, employees });
});
