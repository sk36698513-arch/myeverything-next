# 자동 배포(진짜 “push만 하면 배포”) 설정

이 문서는 **Cursor에서 코드 수정 → GitHub에 push → 서버가 자동 배포**되는 구조를 만드는 방법입니다.

## 0) 전제

- 서버에 코드가 이미 클론되어 있고(예: `/var/www/myeverything-next`)
- `pm2`, `node`, `npm`이 설치되어 있으며
- `myeverything.kr` Nginx가 해당 서버를 보고 있음

## 1) GitHub Actions Secrets 등록(필수)

GitHub 레포 → Settings → Secrets and variables → Actions → **New repository secret**

- **`DEPLOY_HOST`**: 서버 IP 또는 도메인
- **`DEPLOY_USER`**: SSH 유저 (예: `deploy`)
- **`DEPLOY_PORT`**: SSH 포트 (예: `22`)
- **`DEPLOY_PATH`**: 서버에서 레포가 있는 경로 (예: `/var/www/myeverything-next`)
- **`DEPLOY_SSH_KEY`**: SSH private key (아래 2번에서 생성)

## 2) 서버에서 배포용 SSH 키 만들기(1회)

서버에서:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""
cat ~/.ssh/github_actions_deploy.pub
```

### (A) 서버가 “본인 서버”라면(자기 자신에 접속)

```bash
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### (B) 다른 서버로 배포하는 구조라면

`authorized_keys`는 “배포 대상 서버”에 넣어야 합니다.

## 3) GitHub에 private key 등록

서버에서 아래를 복사해서 GitHub Secret `DEPLOY_SSH_KEY`에 붙여넣기:

```bash
cat ~/.ssh/github_actions_deploy
```

## 4) 자동 배포 동작 방식

`.github/workflows/deploy-prod.yml`가 `main`에 push될 때마다 실행되고,
서버에 SSH로 들어가서 아래 스크립트를 실행합니다:

- `scripts/deploy-prod.sh`

이 스크립트는:

- `git pull --ff-only`
- Next.js `npm ci` → `npm run build` → `pm2 restart`
- mobile(Expo) `npx expo export --platform web --output-dir dist`

## 5) 문제 생기면 어디를 보나요?

- GitHub → Actions 탭에서 배포 로그 확인
- 서버에서:

```bash
pm2 list
pm2 logs myeverything-next --lines 200
```

