# CLAUDE.md — TickyTack

Bun/Elysia.js API + Vue 3 SPA (Vuetify 3, Pinia, Vite). Live at https://tickytack.app.

## Deployment

Deployment configuration lives in sibling repo `../tickytack-deploy/` (GitHub: `gjovanov/tickytack-deploy`). Kustomize manifests under `k8s/base/` + `k8s/overlays/prod/`. NodePort 30031.

**GitOps**: ArgoCD at [argocd.roomler.ai](https://argocd.roomler.ai) reconciles the `tickytack` Application from `github.com/gjovanov/tickytack-deploy` path `k8s/overlays/prod`.

> Verified against the live cluster on 2026-08-30: `targetRevision` is **`master`**,
> not `gitops-pilot`, and the sync policy is **automated** (`prune: true`,
> `selfHeal: true`) — not manual. Bumping `newTag` on `master` and pushing is
> enough; ArgoCD rolls it out on its own. `gitops-pilot` is stale and, notably,
> is *missing the tier-policy patches below* — merging it into `master` would
> silently drop the `tier=high-performance` nodeAffinity.

**Image source**: `registry.roomler.ai/tickytack:<tag>`, `imagePullPolicy: IfNotPresent`. Pull secret `regcred` in the `tickytack` namespace.

The Dockerfile uses `bun install --linker hoisted` in the builder stage so all deps materialize directly under `/app/node_modules/<pkg>` and the final-stage `COPY` picks everything up. Without `--linker hoisted`, Bun's default isolated install creates symlinks into `/root/.bun/install/cache/`, which isn't copied to the final stage — leading to `ENOENT elysia` at runtime.

**The hoisted linker alone is not sufficient — the build context must also be clean.**
`COPY . /app` runs before `bun install`, so a checkout that has ever had a plain
`bun install` run in it carries `packages/*/node_modules` symlink trees that
shadow the hoisted install and dangle in the final stage, reproducing the very
same `ENOENT reading "/app/packages/api/node_modules/elysia"` crash-loop. The
`.dockerignore` (added 2026-08-30) excludes them, along with `.env` — which was
previously being baked into the registry image even though the container gets
its configuration from the `tickytack-secret`.

Secrets (`tickytack-secret`, `mongodb-secret`) are sealed via Bitnami SealedSecrets and committed to git under `k8s/base/sealed/`.

### Deployment Workflow

```bash
ssh mars
cd /home/gjovanov/tickytack && git checkout master && git pull --ff-only
rm -rf node_modules packages/*/node_modules   # see the build-context note above

docker build -t registry.roomler.ai/tickytack:build-$$ .
TAG="v$(date +%Y%m%d)-$(docker images -q registry.roomler.ai/tickytack:build-$$ | head -c 12)"

# smoke-test the image before pushing — catches the ENOENT-elysia crash-loop
docker run --rm --entrypoint sh registry.roomler.ai/tickytack:build-$$ -c 'ls -d /app/node_modules/elysia'

docker tag registry.roomler.ai/tickytack:build-$$ registry.roomler.ai/tickytack:$TAG
docker tag registry.roomler.ai/tickytack:build-$$ registry.roomler.ai/tickytack:latest
docker push registry.roomler.ai/tickytack:$TAG
docker push registry.roomler.ai/tickytack:latest

# master is the branch ArgoCD tracks — NOT gitops-pilot
cd /home/gjovanov/tickytack-deploy && git checkout master && git pull --ff-only
sed -i "s|^\( *\)newTag:.*|\1newTag: $TAG|" k8s/overlays/prod/kustomization.yaml
git diff --stat                                    # expect exactly 1 line changed
grep -c high-performance k8s/overlays/prod/kustomization.yaml   # tier policy intact
git commit -am "chore(k8s): bump tickytack to $TAG" && git push origin master

# sync policy is automated, so this is just to watch it land.
# `argocd` needs a live session; if it reports "Token is expired", use kubectl:
kubectl -n argocd annotate app tickytack argocd.argoproj.io/refresh=hard --overwrite
kubectl -n argocd get app tickytack -o jsonpath='{.status.sync.status} {.status.health.status}{"\n"}'
kubectl -n tickytack get pods
curl -sI https://tickytack.app/
```

## K8s deployment placement

Cluster has three zones via `topology.kubernetes.io/zone`: `mars`,
`zeus`, `jupiter` (one master + one worker VM per bare-metal host).
Apps are split by tier (added 2026-05-01 after a mars-host overload
incident):

  - `tier=high-performance` (zeus + jupiter workers): this app, plus
    roomler / roomler-ai / oxmux / lgr / purestat / tickytack / clawui
    (when migrated to K8s).
  - `tier=utility` (mars worker): bauleiter, regal, monitoring stack,
    docker registry, image builds.

Enforced via a Kustomize patch in `tickytack-deploy/k8s/overlays/prod/
kustomization.yaml` that puts a required `nodeAffinity` on every
Deployment + StatefulSet. Hostname pins in `base/` are retained where
the StatefulSet PVC uses node-local storage; the tier requirement is
an *additional* constraint — both must match.
