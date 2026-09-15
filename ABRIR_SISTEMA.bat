@echo off
setlocal
cd /d "%~dp0"

if not exist "MVP_VISUAL.html" (
  echo ERRO: O arquivo MVP_VISUAL.html nao foi encontrado.
  echo Extraia todos os arquivos do ZIP antes de executar este lancador.
  pause
  exit /b 1
)

echo Abrindo o MVP visual no navegador...
start "" "%~dp0MVP_VISUAL.html"

if errorlevel 1 (
  echo.
  echo Nao foi possivel abrir o navegador automaticamente.
  echo Abra manualmente o arquivo MVP_VISUAL.html nesta pasta.
  pause
  exit /b 1
)

exit /b 0
