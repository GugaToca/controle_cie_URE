@echo off
title Myboot.win - Instalador

rem ===================================================================
rem   MYBOOT.WIN - INSTALADOR
rem
rem   Este arquivo tem poucos KB. Ele baixa o resto sozinho.
rem   O usuario so precisa dar duplo clique.
rem
rem   >>> Quando o dominio myboot.win entrar no ar, troque a linha
rem       abaixo por:  set "SITE=https://myboot.win"                <<<
rem ===================================================================

set "SITE=https://myboot-win.netlify.app"

rem ===================================================================

chcp 1252 >nul 2>&1
set "ALVO=%ProgramData%\Myboot"
set "PACOTE=%TEMP%\myboot-sistema.zip"

rem --- Precisa de administrador ---
net session >nul 2>&1
if %errorlevel% equ 0 goto :ADMIN_OK

echo.
echo   Preciso de permissao de administrador.
echo   Confirme na janela que vai aparecer.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b

:ADMIN_OK
cls
color 0B
echo.
echo   ================================================================
echo                          MYBOOT.WIN
echo                Formatacao pela rede - Instalador
echo   ================================================================
echo.
echo    Site: %SITE%
echo.

rem --- Conferir internet ---
echo    [1/4] Verificando a conexao...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; try { $r=Invoke-WebRequest -Uri '%SITE%/versao.txt' -UseBasicParsing -TimeoutSec 20; exit 0 } catch { exit 1 }"

if errorlevel 1 (
    echo.
    echo    [ERRO] Nao consegui acessar o site.
    echo.
    echo    Confira:
    echo      - O computador esta conectado a internet?
    echo      - O endereco %SITE% esta certo?
    echo      - A rede do local bloqueia esse endereco?
    echo.
    pause
    exit /b 1
)
echo          Conexao OK.
echo.

rem --- Baixar o sistema ---
echo    [2/4] Baixando o sistema (alguns segundos)...
if exist "%PACOTE%" del /f /q "%PACOTE%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri '%SITE%/sistema.zip' -OutFile '%PACOTE%' -UseBasicParsing -TimeoutSec 300; exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }"

if errorlevel 1 (
    echo.
    echo    [ERRO] Falha ao baixar o sistema.
    echo    Confira se o arquivo sistema.zip esta publicado no site.
    echo.
    pause
    exit /b 1
)
echo          Download concluido.
echo.

rem --- Instalar ---
echo    [3/4] Instalando em %ALVO% ...
if exist "%ALVO%" rmdir /s /q "%ALVO%" >nul 2>&1
mkdir "%ALVO%" >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('%PACOTE%','%ALVO%'); exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }"

if errorlevel 1 (
    echo.
    echo    [ERRO] Falha ao extrair o sistema.
    echo.
    pause
    exit /b 1
)

rem Grava o endereco do site para o sistema saber onde buscar as imagens
echo %SITE%> "%ALVO%\site.txt"

del /f /q "%PACOTE%" >nul 2>&1
echo          Instalado.
echo.

rem --- Abrir ---
echo    [4/4] Abrindo a tela principal...
echo.

if not exist "%ALVO%\sistema\menu.ps1" (
    echo    [ERRO] O pacote baixado nao tem o formato esperado.
    echo    Falta: %ALVO%\sistema\menu.ps1
    echo.
    pause
    exit /b 1
)

cd /d "%ALVO%"
powershell -NoProfile -ExecutionPolicy Bypass -File "sistema\menu.ps1"

exit /b 0
