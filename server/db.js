import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDatabasePath = path.join(__dirname, 'data', 'ativos-ti.db');
const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : defaultDatabasePath;

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
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
  const registration = String(process.env.ADMIN_REGISTRATION || '').trim();
  const name = String(process.env.ADMIN_NAME || '').trim();
  const password = String(process.env.ADMIN_PASSWORD || '');

  if (!registration || !name || password.length < 12) {
    throw new Error(
      'Banco vazio: configure ADMIN_REGISTRATION, ADMIN_NAME e ADMIN_PASSWORD (mínimo de 12 caracteres).'
    );
  }

  db.prepare(
    'INSERT INTO users (registration, name, password_hash, role, employee_type) VALUES (?, ?, ?, ?, ?)'
  ).run(registration, name, bcrypt.hashSync(password, 12), 'admin', 'quadro');

  console.log(`Administrador inicial criado para a matrícula ${registration}.`);
}
