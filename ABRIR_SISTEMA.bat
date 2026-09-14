@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo  GESTAO DE ATIVOS DE TI - COMPLEXO TUCURUI
echo ==============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado.
  echo Instale o Node.js 20 LTS e tente novamente.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERRO: npm nao foi encontrado.
  echo Reinstale o Node.js com o npm habilitado.
  pause
  exit /b 1
)

if not exist .env (
  copy /Y .env.example .env >nul
  echo Arquivo .env criado automaticamente.
)

if not exist node_modules (
  echo Instalando dependencias. Isso pode levar alguns minutos...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERRO ao instalar as dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando o sistema...
echo Quando aparecer Local: http://localhost:5173 abra esse endereco no navegador.
echo.
call npm run dev

pause
