#!/usr/bin/env bash
# Build + push + rollout the console image to byte-cluster.
#
# Usage:
#   ./scripts/deploy-frontend.sh <topic-slug>
# Example:
#   ./scripts/deploy-frontend.sh trajectories-search
#
# Tag format: byte-<YYYYMMDD>-<topic-slug>-r<N>
#   - <N> auto-increments by scanning the cluster's current image tag.
#   - Push goes to docker.io/opspai (k8s pulls from
#     pair-cn-shanghai.cr.volces.com/opspai mirror, which auto-syncs).
#
# What it does (and does NOT do):
#   - DOES: pnpm check (type-check + lint + lint:css + format:check)
#   - DOES: docker buildx --platform linux/amd64 + push (latest + tag)
#   - DOES: kubectl set image + rollout status wait
#   - DOES NOT: git commit; bump aegislab manifest. Do those separately
#     if you want the rollout encoded in version control.
#
# Requirements:
#   - docker login docker.io as opspai (or equivalent push creds)
#   - kubectl context on byte-cluster, namespace `exp`
#   - pnpm + node 20+

set -euo pipefail

TOPIC="${1:-update}"
NS="exp"
DEPLOY="rcabench-frontend"
CONTAINER="rcabench-frontend"  # NOT "frontend" — common foot-gun
PUSH_REPO="docker.io/opspai/rcabench-frontend"
CLUSTER_REPO="pair-cn-shanghai.cr.volces.com/opspai/rcabench-frontend"

DATE="$(date -u +%Y%m%d)"

# Derive next rN by reading the current cluster image tag.
CUR_TAG="$(kubectl get deploy "$DEPLOY" -n "$NS" -o jsonpath='{.spec.template.spec.containers[0].image}' | awk -F: '{print $NF}')"
NEXT_N=1
if [[ "$CUR_TAG" =~ -r([0-9]+)$ ]]; then
    NEXT_N=$((${BASH_REMATCH[1]} + 1))
fi
TAG="byte-${DATE}-${TOPIC}-r${NEXT_N}"

echo "=> current cluster tag: $CUR_TAG"
echo "=> new tag:             $TAG"
echo

echo "==> 1/4 pnpm check"
pnpm check

echo
echo "==> 2/4 docker build + push ($PUSH_REPO:{$TAG,latest})"
docker buildx build \
    --platform linux/amd64 \
    -t "$PUSH_REPO:$TAG" \
    -t "$PUSH_REPO:latest" \
    -f Dockerfile . \
    --push

echo
echo "==> 3/4 kubectl set image (container=$CONTAINER, deploy=$DEPLOY, ns=$NS)"
kubectl set image "deploy/$DEPLOY" -n "$NS" \
    "$CONTAINER=$CLUSTER_REPO:$TAG"

echo
echo "==> 4/4 wait for rollout"
kubectl rollout status "deploy/$DEPLOY" -n "$NS" --timeout=180s

echo
echo "Deployed $TAG. Hard-refresh the browser (Ctrl+Shift+R) to pick up new chunks."
echo "If you want to encode this rollout in git, also bump"
echo "  ../aegis/aegislab/manifests/byte-cluster/frontend.values.yaml"
echo "  → image.tag: $TAG"
echo "and commit there."
