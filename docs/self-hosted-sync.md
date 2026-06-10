# Self-hosted stats sync (Hetzner + MySQL)

The app works fully offline using `localStorage`. Stats sync across devices via a
small API ([`server/`](../server)) on the Hetzner box, in front of MySQL.
Single-user: a bearer token gates all access — no login/email.

```
browser ──HTTPS──▶ Apache (api.isayenko.org) ──▶ Node API (127.0.0.1:8787) ──▶ MySQL
                      Let's Encrypt cert            checks Bearer token
```

> **Already provisioned** on `alex-hetzner` (178.105.216.210). This doc is the
> runbook for rebuilding or moving it. The live API token is stored in
> `C:\Users\alex-claude\.env\alex-hetzner.env`.

## Layout on the server

- App: `/opt/lpic-sync/` (`index.js`, `package.json`, `node_modules`, `.env`)
- Service: `/etc/systemd/system/lpic-sync.service` (binds `127.0.0.1:8787`)
- Vhost: `/etc/apache2/sites-available/api.isayenko.org.conf` (:80 redirect-only,
  plus the :443 proxy that activates once the Let's Encrypt cert exists)
- DB: MySQL `lpic.answers`, user `lpic@127.0.0.1`

## Rebuild from scratch

1. **DNS** — A record `api.isayenko.org → <server IP>` (Cloudflare, DNS-only so
   certbot's HTTP-01 challenge reaches the box directly).

2. **Node** — `sudo apt-get install -y nodejs npm` (Node 18+).

3. **Bootstrap** — copy the files and run the idempotent script (creates the DB,
   user, secrets in `/opt/lpic-sync/.env`, and the systemd service):

   ```bash
   scp server/index.js server/package.json server/lpic-sync.service server/setup.sh user@host:/tmp/
   ssh user@host 'sudo bash /tmp/setup.sh'   # prints the generated API_TOKEN
   ```

4. **TLS via Apache** — enable proxy + ssl, install the vhost, get the cert.
   The :80 vhost only answers the ACME challenge and redirects everything else
   to https; the :443 proxy vhost activates on the second reload, once the
   cert files exist:

   ```bash
   sudo a2enmod proxy proxy_http ssl
   scp server/apache-api.conf user@host:/tmp/
   ssh user@host 'sudo cp /tmp/apache-api.conf /etc/apache2/sites-available/api.isayenko.org.conf \
     && sudo a2ensite api.isayenko.org && sudo systemctl reload apache2'
   sudo certbot certonly --apache -d api.isayenko.org --non-interactive --agree-tos -m you@example.com
   sudo systemctl reload apache2
   ```

5. **Point the app at it** — `VITE_API_URL` is baked into the build via
   [`.env.production`](../.env.production); the Pages deploy picks it up. For
   local dev, set it in `.env.local`.

## Use it

App → **View statistics** → paste the `API_TOKEN` into the sync box → **Connect**.
Stats two-way sync immediately and on every new answer. Repeat per device.
**Disconnect** clears the token locally.

## Security notes

- The token is the only credential; anyone with it has full read/write. Rotate
  via `API_TOKEN` in `/opt/lpic-sync/.env` then `sudo systemctl restart lpic-sync`.
- Token is stored in `localStorage` and sent as `Authorization: Bearer`; it is
  **not** in the public bundle.
- The Node API binds to `127.0.0.1`; only Apache (443) faces the internet.
- MySQL currently listens on `0.0.0.0:3306` — consider binding it to `127.0.0.1`.
