@echo off
chcp 65001
echo ==========================================
echo  GitHub 仓库设置脚本
echo ==========================================
echo.
echo 请确保您已经：
echo 1. 安装了 GitHub CLI (gh)
echo 2. 已经登录：gh auth login
echo.
echo 按任意键开始创建仓库...
pause >nul

cd /d "%~dp0"

echo.
echo 正在创建 GitHub 仓库...
gh repo create ai-interview-host --public --source=. --remote=origin --push

if %errorlevel% == 0 (
    echo.
    echo ==========================================
    echo  成功！仓库已创建并推送
    echo  地址：https://github.com/ashuraku-cmd/ai-interview-host
    echo ==========================================
) else (
    echo.
    echo 创建失败，尝试手动方式...
    echo.
    echo 请在浏览器访问：https://github.com/new
    echo 创建名为 ai-interview-host 的公开仓库
    echo 不要勾选 README 和 .gitignore
    echo.
    echo 创建完成后按任意键继续...
    pause >nul
    
    git remote add origin https://github.com/ashuraku-cmd/ai-interview-host.git
    git branch -M main
    git push -u origin main
)

echo.
pause
