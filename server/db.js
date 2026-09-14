import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'ativos-ti.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','user')),
  employee_type TEXT NOT NULL DEFAULT 'quadro' CHECK(employee_type IN ('quadro','terceiro')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patrimonio TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('Desktop','Notebook','Monitor')),
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  status TEXT NOT NULL DEFAULT 'Disponível' CHECK(status IN ('Disponível','Em uso','Manutenção','Baixado')),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  current_user_id INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custody_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL CHECK(action IN ('VINCULADO','DESVINCULADO','TRANSFERIDO','BAIXADO','CRIADO','ATUALIZADO')),
  location_id INTEGER REFERENCES locations(id),
  performed_by INTEGER NOT NULL REFERENCES users(id),
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_patrimonio ON assets(patrimonio);
CREATE INDEX IF NOT EXISTS idx_users_registration ON users(registration);
CREATE INDEX IF NOT EXISTS idx_assets_current_user ON assets(current_user_id);
`);

const insertLocation = db.prepare('INSERT OR IGNORE INTO locations (code, name) VALUES (?, ?)');
[
  ['UHE', 'UHE Tucuruí'],
  ['SE', 'SE Subestação de Tucuruí'],
  ['CTT', 'Centro de Treinamento (CTT)'],
  ['CPA', 'Centro de Proteção Ambiental (CPA)']
].forEach(([code, name]) => insertLocation.run(code, name));

const userCount = db.prepare('SELECT COUNT(*) AS total FROM users').get().total;
if (userCount === 0) {
  const insertUser = db.prepare(`INSERT INTO users (registration, name, password_hash, role, employee_type) VALUES (?, ?, ?, ?, ?)`);
  insertUser.run('1001', 'Técnico de TI', bcrypt.hashSync('admin123', 10), 'admin', 'quadro');
  insertUser.run('84215', 'Carlos Almeida', bcrypt.hashSync('user123', 10), 'user', 'quadro');
  insertUser.run('73104', 'Mariana Souza', bcrypt.hashSync('user123', 10), 'user', 'quadro');
  insertUser.run('90217', 'Rafael Costa', bcrypt.hashSync('user123', 10), 'user', 'terceiro');
}

const assetCount = db.prepare('SELECT COUNT(*) AS total FROM assets').get().total;
if (assetCount === 0) {
  const loc = Object.fromEntries(db.prepare('SELECT id, code FROM locations').all().map(r => [r.code, r.id]));
  const usr = Object.fromEntries(db.prepare('SELECT id, registration FROM users').all().map(r => [r.registration, r.id]));
  const insert = db.prepare(`INSERT INTO assets (patrimonio,type,brand,model,status,location_id,current_user_id) VALUES (?,?,?,?,?,?,?)`);
  insert.run('TU-10482','Desktop','Dell','OptiPlex 7090','Em uso',loc.UHE,usr['84215']);
  insert.run('TU-11891','Notebook','Dell','Latitude 5420','Em uso',loc.CTT,usr['73104']);
  insert.run('TU-12103','Monitor','Dell','P2422H','Em uso',loc.CPA,usr['90217']);
  insert.run('TU-09721','Desktop','HP','ProDesk 400','Disponível',loc.SE,null);
  insert.run('TU-12542','Notebook','Lenovo','ThinkPad E14','Manutenção',loc.UHE,null);
}
