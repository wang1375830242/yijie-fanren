@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo 没有找到 Python。公共碑林需要 Python 3.9+ 才能启动。
  echo 也可以直接双击 index.html 以本机模式打开。
  pause
  exit /b 1
)
start "" http://127.0.0.1:8765/
echo 一介凡人 · 本地服务器已启动
echo http://127.0.0.1:8765/
echo 公共碑林需要保持这个窗口开着。按 Ctrl+C 结束。
python server.py
