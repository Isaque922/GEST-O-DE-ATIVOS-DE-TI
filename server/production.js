import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicPort = Number(process.env.PORT || 3000);
const apiPort = Number(process.env.INTERNAL_API_PORT || 3334);

const apiProcess = spawn(process.execPath, ['server/index.js'], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: String(apiPort),
    CORS_ORIGIN: '*'
  },
  stdio: 'inherit'
});

apiProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`API encerrou inesperadamente com código ${code}.`);
    process.exit(code || 1);
  }
});

const app = express();

app.use('/api', (req, res) => {
  const headers = { ...req.headers, host: `127.0.0.1:${apiPort}` };
  const proxy = http.request({
    hostname: '127.0.0.1',
    port: apiPort,
    path: req.originalUrl,
    method: req.method,
    headers
  }, (proxyRes) => {
    res.status(proxyRes.statusCode || 500);
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      if (value !== undefined) res.setHeader(key, value);
    }
    proxyRes.pipe(res);
  });

  proxy.on('error', (error) => {
    console.error('Falha ao encaminhar requisição para a API:', error);
    if (!res.headersSent) res.status(502).json({ error: 'API temporariamente indisponível.' });
  });

  req.pipe(proxy);
});

app.use(express.static(distDir));

app.use((req, res, next) => {
  if (req.method === 'GET') return res.sendFile(path.join(distDir, 'index.html'));
  next();
});

const server = app.listen(publicPort, '0.0.0.0', () => {
  console.log(`Gestão de Ativos TI disponível na porta ${publicPort}`);
});

function shutdown() {
  server.close(() => {
    apiProcess.kill('SIGTERM');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
