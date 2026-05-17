# Apache2 — LPIC-2 study notes

Reference material extracted from the LPIC-2 Apache2 study sheet.

## Commands

```bash
# restart the Apache service on a CentOS
systemctl restart httpd

# check the configuration syntax
apachectl -t

# add a new user for basic authentication
htpasswd users.passwd john
```

## Modules

- `mod_auth_basic` — basic authentication
- `mod_access_compat` — compatibility with the access control directives used in Apache 2.2

## Configuration

- `.htaccess`
- `.htpasswd`
- `/etc/ssl/certs/`
- `/etc/apache2/sites-available/default-ssl.conf`
- `/etc/apache2/conf-enabled/`

## Logs

- `/var/log/error.log`
- `/var/log/access.log`

## Directives

- `AuthUserFile /path/to/user.passwd` — basic auth via file
- `AuthGroupFile /path/to/group.passwd` — basic auth via file
- `AccessLog`
- `ErrorLog`
- `RedirectMatch ^/archive/(.*)$ http://archive.example.com/$1`
- `StartServers`
- `DocumentRoot /www/var/html`
- `SSLCACertificateFile` — path to a bundle of CA certificates file
- `SSLCertificateFile` — for server certificate concatenated with intermediate CA
- `SSLCertificateKeyFile` — for private key
- `SSLCipherSuite HIGH` — use only strong ciphers and avoid known weak ones
- `SSLProtocol all -SSLv2 -SSLv3` — allow all protocols except SSLv2 and SSLv3
- `ServerTokens` — controls whether Apache shows version number and other info in the HTTP response
