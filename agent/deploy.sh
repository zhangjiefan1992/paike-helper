#!/bin/bash
set -e

REGION="${REGION:-cn-hangzhou}"
REGISTRY="registry.${REGION}.aliyuncs.com/paike/agent"
TAG="${TAG:-latest}"
IMAGE="${REGISTRY}:${TAG}"

echo "=== 1. 复制知识文件 ==="
rm -rf knowledge && mkdir -p knowledge
cp ../knowledge/distilled/*.md knowledge/

echo "=== 2. 构建镜像 ==="
docker build --platform linux/amd64 -t "$IMAGE" .

echo "=== 3. 推送镜像 ==="
docker push "$IMAGE"

echo "=== 4. 部署到 FC ==="
s deploy --use-local -y

echo "=== Done! ==="
echo "Image: $IMAGE"
echo "Test: curl https://ai.keleya.org/health"
