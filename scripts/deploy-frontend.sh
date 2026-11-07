#!/usr/bin/env bash
# Build + push + rollout the console image to byte-cluster.
#
# Usage:
#   KUBE_CONTEXT=<byte-cluster context> ./scripts/deploy-frontend.sh <topic-slug>
# Example:
#   KUBE_CONTEXT=byte-cluster ./scripts/deploy-frontend.sh trajectories-search
#
# Tag format: byte-<YYYYMMDD>-<topic-slug>-<short-sha>-r<N>
#   - <short-sha> is the commit the image is built from; the working tree
#     must be clean, so the image is exactly that commit.
#   - <N> auto-increments by scanning the cluster's current image tag.
#   - Push goes to docker.io/opspai; k8s pulls from the
#     pair-cn-shanghai.cr.volces.com/opspai mirror, which syncs from it.
#     The script waits for the tag to appear on the mirror before it
#     points the deployment at it.
#
# What it does (and does NOT do):
#   - DOES: refuse a dirty working tree
#   - DOES: pnpm check (type-check, lint, lint:css, format:check,
#     check:gallery, check:tokens, check:mcp-tools)
#   - DOES: docker buildx --platform linux/amd64 + push (latest + tag)
#   - DOES: wait for the mirror, kubectl set image + rollout status wait,
#     and kubectl rollout undo when the rollout fails
#   - DOES NOT: git commit; bump aegislab manifest. Do those separately
#     if you want the rollout encoded in version control.
#
# Requirements:
#   - docker login docker.io as opspai (or equivalent push creds)
#   - KUBE_CONTEXT naming the byte-cluster kubectl context, namespace `exp`;
#     every kubectl call uses it, never the currently selected context
#   - read access to the volces mirror from this machine
#   - pnpm + node 22+
#
# Environment:
#   KUBE_CONTEXT          required, see above
#   MIRROR_WAIT_SECONDS   how long to wait for the mirror (default 900)

set -euo pipefail

TOPIC="${1:-update}"
NS="exp"
DEPLOY="rcabench-frontend"
CONTAINER="rcabench-frontend"  # NOT "frontend" — common foot-gun
PUSH_REPO="docker.io/opspai/rcabench-frontend"
CLUSTER_REPO="pair-cn-shanghai.cr.volces.com/opspai/rcabench-frontend"
MIRROR_WAIT_SECONDS="${MIRROR_WAIT_SECONDS:-900}"

if [[ -z "${KUBE_CONTEXT:-}" ]]; then
    echo "KUBE_CONTEXT is not set. Name the byte-cluster context explicitly, e.g." >&2
    echo "  KUBE_CONTEXT=<context> $0 $TOPIC" >&2
    echo "Known contexts:" >&2
    kubectl config get-contexts -o name >&2
    exit 1
fi
if ! kubectl config get-contexts -o name | grep -qxF -- "$KUBE_CONTEXT"; then
    echo "kubectl has no context named '$KUBE_CONTEXT'." >&2
    exit 1
fi
kc() {
    kubectl --context "$KUBE_CONTEXT" -n "$NS" "$@"
}

cd "$(git rev-parse --show-toplevel)"
if [[ -n "$(git status --porcelain)" ]]; then
    echo "The working tree has uncommitted or untracked files; the image would not match any commit." >&2
    echo "Commit or stash them first:" >&2
    git status --short >&2
    exit 1
fi
SHA="$(git rev-parse --short=7 HEAD)"

DATE="$(date -u +%Y%m%d)"

# Derive next rN by reading the current cluster image tag.
CUR_IMAGE="$(kc get deploy "$DEPLOY" -o jsonpath='{.spec.template.spec.containers[0].image}')"
CUR_TAG="${CUR_IMAGE##*:}"
NEXT_N=1
if [[ "$CUR_TAG" =~ -r([0-9]+)$ ]]; then
    NEXT_N=$((BASH_REMATCH[1] + 1))
fi
TAG="byte-${DATE}-${TOPIC}-${SHA}-r${NEXT_N}"

echo "=> context:             $KUBE_CONTEXT"
echo "=> current cluster tag: $CUR_TAG"
echo "=> new tag:             $TAG"
echo

echo "==> 1/5 pnpm check"
pnpm check

echo
echo "==> 2/5 docker build + push ($PUSH_REPO:{$TAG,latest})"
docker buildx build \
    --platform linux/amd64 \
    -t "$PUSH_REPO:$TAG" \
    -t "$PUSH_REPO:latest" \
    -f Dockerfile . \
    --push

echo
echo "==> 3/5 wait for $CLUSTER_REPO:$TAG (up to ${MIRROR_WAIT_SECONDS}s)"
deadline=$((SECONDS + MIRROR_WAIT_SECONDS))
until docker buildx imagetools inspect "$CLUSTER_REPO:$TAG" > /dev/null 2>&1; do
    if ((SECONDS >= deadline)); then
        echo "The mirror does not have $TAG after ${MIRROR_WAIT_SECONDS}s; the deployment is unchanged." >&2
        echo "Re-run once it has synced, or raise MIRROR_WAIT_SECONDS." >&2
        exit 1
    fi
    sleep 15
done

echo
echo "==> 4/5 kubectl set image (context=$KUBE_CONTEXT, container=$CONTAINER, deploy=$DEPLOY, ns=$NS)"
kc set image "deploy/$DEPLOY" "$CONTAINER=$CLUSTER_REPO:$TAG"

echo
echo "==> 5/5 wait for rollout"
if ! kc rollout status "deploy/$DEPLOY" --timeout=180s; then
    echo >&2
    echo "Rollout of $TAG failed; rolling back to $CUR_IMAGE." >&2
    kc rollout undo "deploy/$DEPLOY"
    kc rollout status "deploy/$DEPLOY" --timeout=180s
    exit 1
fi

echo
echo "Deployed $TAG. Open tabs pick up the new build on their next reload."
echo "If you want to encode this rollout in git, also bump"
echo "  ../aegis/aegislab/manifests/byte-cluster/frontend.values.yaml"
echo "  → image.tag: $TAG"
echo "and commit there."
