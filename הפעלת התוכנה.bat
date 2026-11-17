@echo off
chcp 65001 >nul
title סימן מים בקליק
echo פותח את האפליקציה...
start msedge --app="%~dp0index.html"
if %errorlevel% neq 0 (
    start "" "%~dp0index.html"
)
