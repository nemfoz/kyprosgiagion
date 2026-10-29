#!/bin/sh
# Ships this working tree to the server and rebuilds the container:   sh deploy/deploy.sh
# The server keeps its own .env and storage/ (database, photos, backups); they are never copied or deleted.
set -eu
HOST=${DEPLOY_HOST:-nmf@sv.hasnofriends.com}
DIR=${DEPLOY_DIR:-/srv/nvme/platform/stacks/projects/odoiporiko.com/app}
cd "$(dirname "$0")/.."

# A new build id empties the data caches (lib/cache.ts): the start-up migrations may have changed the data.
BUILD=$(git rev-parse --short HEAD)$(git diff --quiet HEAD || echo "-dirty")-$(date +%s)

rsync -az --delete \
  --exclude /.env --exclude '/.env.*' --exclude /storage --exclude /node_modules --exclude /.next --exclude /.git \
  --exclude /.vercel --exclude /uploads --exclude '/data/app.db*' --exclude /data/.secret --exclude '/*.pdf' \
  --exclude /tsconfig.tsbuildinfo --exclude /next-env.d.ts \
  ./ "$HOST:$DIR/"

ssh -T "$HOST" "set -e; cd $DIR
  if grep -q '^APP_BUILD_ID=' .env; then sed -i 's/^APP_BUILD_ID=.*/APP_BUILD_ID=$BUILD/' .env; else echo 'APP_BUILD_ID=$BUILD' >> .env; fi
  docker compose up -d --build 2>&1 | tail -3
  for i in \$(seq 30); do curl -sf -o /dev/null http://127.0.0.1:\$(grep -oP '^HOST_PORT=\K.*' .env || echo 4002)/ && break; sleep 2; done
  docker compose logs --tail 6 app
  docker image prune -f >/dev/null" < /dev/null
echo "deployed $BUILD — https://odoiporiko.com"
