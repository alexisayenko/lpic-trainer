# Self-hosted stats sync (Hetzner + MySQL)

The app works fully offline using `localStorage`. To sync stats across devices,
run the small API in [`server/`](../server) on your Hetzner box in front of MySQL.
Single-user: a bearer token gates all access — no login/email needed.

```
browser ──HTTPS──▶ Caddy (api.isayenko.org) ──▶ Node API (127.0.0.1:8787) ──▶ MySQL
                         auto Let's Encrypt          checks Bearer token
```

## 1. DNS

Add an **A record** `api.isayenko.org` → your Hetzner server IP. (A TLS cert
needs a hostname; a bare IP can't get one.) Wait for it to resolve.

## 2. Database

```bash
mysql -u root -p < server/schema.sql
# then create the least-privilege user shown (commented) at the bottom of schema.sql
```

## 3. Deploy the API

```bash
# on the server
sudo mkdir -p /opt/lpic-sync
sudo cp server/index.js server/package.json /opt/lpic-sync/
cd /opt/lpic-sync
npm install --omit=dev            # needs Node 18+ ; install via nodesource if absent

cp /path/to/repo/server/.env.example /opt/lpic-sync/.env
openssl rand -hex 32              # paste the result as API_TOKEN in .env
$EDITOR .env                      # fill DB_PASSWORD, API_TOKEN, ALLOWED_ORIGINS
```

Install the service:

```bash
sudo cp server/lpic-sync.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now lpic-sync
systemctl status lpic-sync         # should be active (running)
curl localhost:8787/health         # {"ok":true}
```

## 4. TLS via Caddy

```bash
# install Caddy: https://caddyserver.com/docs/install
sudo cp server/Caddyfile /etc/caddy/Caddyfile   # edit the hostname if different
sudo systemctl reload caddy
curl https://api.isayenko.org/health             # {"ok":true} over HTTPS
```

Open the firewall for 80/443 only (the Node port stays on localhost):

```bash
sudo ufw allow 80,443/tcp
```

## 5. Point the app at it

- **Local dev**: copy `.env.example` to `.env.local`, set
  `VITE_API_URL=https://api.isayenko.org`.
- **GitHub Pages**: add a repo **variable** (not secret — the URL isn't secret)
  `VITE_API_URL` (Settings → Secrets and variables → Actions → Variables). The
  deploy workflow injects it at build time. Re-run the deploy.

## 6. Connect a device

Open the app → **View statistics** → paste the `API_TOKEN` into the sync box →
**Connect**. Stats two-way sync immediately and on every new answer. Repeat the
paste on each device you want synced. **Disconnect** clears the token locally.

## Security notes

- The token is the only credential; anyone with it has full read/write. Rotate
  by changing `API_TOKEN` in `.env` and `systemctl restart lpic-sync`.
- The token is stored in `localStorage` and sent as `Authorization: Bearer`. It
  is **not** baked into the public bundle, so it isn't exposed by the static site.
- Keep MySQL bound to `127.0.0.1`; only Caddy (443) faces the internet.
