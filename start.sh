#!/bin/bash
set -e

cd "$(dirname "$0")/backend"

PORT=${PORT:-8001}

echo "========================================="
echo "  A股分析平台"
echo "  浏览器打开: http://localhost:$PORT"
echo "  Ctrl+C 停止服务"
echo "========================================="
echo ""

uvicorn main:app --host 0.0.0.0 --port "$PORT"
