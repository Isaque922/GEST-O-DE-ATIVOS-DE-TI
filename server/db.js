import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('Configure DATABASE_URL com a conexão PostgreSQL do Neon.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 5
});

// Drizzle fornece a camada ORM; as consultas parametrizadas ficam centralizadas
// aqui para manter a migração do MVP pequena e auditável.
export const orm = drizzle(pool);

export async function query(text, params = []) {
  return orm.$client.query(text, params);
}

export async function one(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

export async function many(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

export async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS locations (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      registration TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','user')),
      employee_type TEXT NOT NULL DEFAULT 'quadro' CHECK(employee_type IN ('quadro','terceiro')),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assets (
      id BIGSERIAL PRIMARY KEY,
      patrimonio TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('Desktop','Notebook','Monitor')),
      brand TEXT,
      model TEXT,
      serial_number TEXT,
      status TEXT NOT NULL DEFAULT 'Disponível' CHECK(status IN ('Disponível','Em uso','Manutenção','Baixado')),
      location_id BIGINT NOT NULL REFERENCES locations(id),
      current_user_id BIGINT REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS custody_history (
      id BIGSERIAL PRIMARY KEY,
      asset_id BIGINT NOT NULL REFERENCES assets(id),
      user_id BIGINT REFERENCES users(id),
      action TEXT NOT NULL CHECK(action IN ('VINCULADO','DESVINCULADO','TRANSFERIDO','BAIXADO','CRIADO','ATUALIZADO')),
      location_id BIGINT REFERENCES locations(id),
      performed_by BIGINT NOT NULL REFERENCES users(id),
      details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS maintenance (
      id BIGSERIAL PRIMARY KEY,
      asset_id BIGINT NOT NULL REFERENCES assets(id),
      description TEXT NOT NULL,
      provider TEXT,
      opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'Aberta' CHECK(status IN ('Aberta','Em andamento','Concluída')),
      created_by BIGINT NOT NULL REFERENCES users(id),
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      app_name TEXT NOT NULL,
      app_subtitle TEXT NOT NULL,
      accent_color TEXT NOT NULL,
      sidebar_color TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_assets_patrimonio ON assets(patrimonio);
    CREATE INDEX IF NOT EXISTS idx_users_registration ON users(registration);
    CREATE INDEX IF NOT EXISTS idx_assets_current_user ON assets(current_user_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance(asset_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status);
  `);

  await query(`INSERT INTO locations (code, name) VALUES
    ('UHE', 'UHE Tucuruí'),
    ('SE', 'SE Subestação de Tucuruí'),
    ('CTT', 'Centro de Treinamento (CTT)'),
    ('CPA', 'Centro de Proteção Ambiental (CPA)')
    ON CONFLICT DO NOTHING`);

  await query(`INSERT INTO app_settings (id,app_name,app_subtitle,accent_color,sidebar_color)
    VALUES (1,'ATIVOS TI','COMPLEXO TUCURUÍ','#0aa68f','#07111f')
    ON CONFLICT (id) DO NOTHING`);

  const count = await one('SELECT COUNT(*)::int AS total FROM users');
  if (count.total === 0) {
    const registration = String(process.env.ADMIN_REGISTRATION || '').trim();
    const name = String(process.env.ADMIN_NAME || '').trim();
    const password = String(process.env.ADMIN_PASSWORD || '');

    if (!registration || !name || password.length < 12) {
      throw new Error(
        'Banco vazio: configure ADMIN_REGISTRATION, ADMIN_NAME e ADMIN_PASSWORD (mínimo de 12 caracteres).'
      );
    }

    await query(
      'INSERT INTO users (registration,name,password_hash,role,employee_type) VALUES ($1,$2,$3,$4,$5)',
      [registration, name, bcrypt.hashSync(password, 12), 'admin', 'quadro']
    );
    console.log(`Administrador inicial criado para a matrícula ${registration}.`);
  }
}

export async function closeDatabase() {
  await pool.end();
}
