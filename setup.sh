#!/bin/bash
set -e

echo "========================================="
echo "  A股分析平台 — 首次安装"
echo "========================================="

cd "$(dirname "$0")"

# 1. Python dependencies
echo ""
echo "[1/2] 安装 Python 依赖..."
pip3 install fastapi "uvicorn[standard]" akshare pandas numpy 2>&1 | grep -E "^(Successfully|Already|Requirement)" || true
echo "      Python 依赖安装完成"

# 2. Build frontend
echo ""
echo "[2/2] 构建前端页面..."
cd frontend
npm install --silent
NO_PROXY='*' no_proxy='*' npm run build
cd ..
echo "      前端构建完成"

echo ""
echo "========================================="
echo "  安装完成！运行 ./start.sh 启动服务"
echo "========================================="
