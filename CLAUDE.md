# CLAUDE.md — TickyTack

Bun/Elysia.js API + Vue 3 SPA (Vuetify 3, Pinia, Vite). Live at https://tickytack.app.

## Deployment

Deployment configuration lives in sibling repo `../tickytack-deploy/` (GitHub: `gjovanov/tickytack-deploy`). Kustomize manifests under `k8s/base/` + `k8s/overlays/prod/`. Pod runs on `k8s-worker-1`, NodePort 30031.

**GitOps**: ArgoCD at [argocd.roomler.ai](https://argocd.roomler.ai) reconciles the `tickytack` Application from `github.com/gjovanov/tickytack-deploy @ gitops-pilot` path `k8s/overlays/prod`. Sync policy is **Manual** — trigger via `argocd app sync tickytack` or UI.

**Image source**: `registry.roomler.ai/tickytack:<tag>`, `imagePullPolicy: IfNotPresent`. Pull secret `regcred` in the `tickytack` namespace.

The Dockerfile uses `bun install --linker hoisted` in the builder stage so all deps materialize directly under `/app/node_modules/<pkg>` and the final-stage `COPY` picks everything up. Without `--linker hoisted`, Bun's default isolated install creates symlinks into `/root/.bun/install/cache/`, which isn't copied to the final stage — leading to `ENOENT elysia` at runtime.

Secrets (`tickytack-secret`, `mongodb-secret`) are sealed via Bitnami SealedSecrets and committed to git under `k8s/base/sealed/`.

### Deployment Workflow

```bash
ssh mars
cd /home/gjovanov/tickytack && git pull
docker build -t registry.roomler.ai/tickytack:build-$$ .
TAG="v$(date +%Y%m%d)-$(docker images -q registry.roomler.ai/tickytack:build-$$ | head -c 12)"
docker tag registry.roomler.ai/tickytack:build-$$ registry.roomler.ai/tickytack:$TAG
docker tag registry.roomler.ai/tickytack:build-$$ registry.roomler.ai/tickytack:latest
docker push registry.roomler.ai/tickytack:$TAG
docker push registry.roomler.ai/tickytack:latest

cd /home/gjovanov/tickytack-deploy && git checkout gitops-pilot
sed -i "s|newTag:.*|newTag: $TAG|" k8s/overlays/prod/kustomization.yaml
git commit -am "chore(k8s): bump tickytack to $TAG" && git push
argocd app sync tickytack --grpc-web
curl -sI https://tickytack.app/
```
