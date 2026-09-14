import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'troque-esta-chave-em-producao';

export function signToken(user) {
  return jwt.sign({ id: user.id, registration: user.registration, role: user.role, name: user.name }, secret, { expiresIn: '8h' });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token ausente.' });
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito aos Técnicos de TI.' });
  next();
}
