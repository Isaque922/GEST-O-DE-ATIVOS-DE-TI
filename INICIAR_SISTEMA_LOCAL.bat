@echo off
setlocal
cd /d "%~dp0"

title Gestao de Ativos TI - Inicializacao local

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERRO: Node.js nao foi encontrado nesta maquina.
  echo Instale o Node.js 22 LTS em https://nodejs.org e execute este arquivo novamente.
  echo.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo.
  echo ERRO: package.json nao foi encontrado.
  echo Extraia todos os arquivos do projeto antes de executar este lancador.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando as dependencias do sistema. Aguarde...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERRO: Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
  )
)

echo Iniciando a interface local...
start "Ativos TI - Servidor local" cmd /k "set VITE_API_URL=https://gestao-ativos-ti-tucurui.onrender.com/api&& npm run dev:web"

echo Aguardando o sistema ficar disponivel...
powershell -NoProfile -Command "$url='http://localhost:5173'; for($i=0;$i -lt 40;$i++){try{Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 2 | Out-Null; exit 0}catch{Start-Sleep -Seconds 1}}; exit 1"

if errorlevel 1 (
  echo.
  echo O servidor foi iniciado, mas demorou mais que o esperado.
  echo Abra manualmente: http://localhost:5173
  pause
  exit /b 0
)

start "" "http://localhost:5173"
echo.
echo Sistema aberto em http://localhost:5173
echo Os dados continuam armazenados no banco Neon.
echo Mantenha a janela do servidor aberta durante o uso.
timeout /t 5 >nul
exit /b 0
