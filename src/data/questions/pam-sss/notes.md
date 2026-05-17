# LPIC-2: PAM and SSSD — Study Notes

## sssd.conf

Defines how SSSD (System Security Services Daemon) retrieves identity and
authentication information.

- Used by PAM via `pam_sss.so`.
- Used by NSS via `sss` in `/etc/nsswitch.conf`.

Key directives:

- `cache_credentials` — caches user credentials for faster subsequent logins.
- `id_provider` — ensures the sssd daemon fetches user data and authentication
  from the configured source (e.g. `ldap`).
- `services` — services SSSD provides; for LDAP authentication set
  `services = nss, pam` (`nss` retrieves user info, `pam` manages authentication).
- `ldap_uri` — the LDAP server URI, defined under a domain section such as
  `[domain/default]`.

## PAM Configuration Files

- `/etc/pam.conf` — configuration for all services (centralized; can override
  per-service files).
- `/etc/pam.d/` — directory of per-service configuration files.
- `/etc/pam.d/passwd` — rules applied when users change their passwords.
- `/etc/pam.d/myapp` — rules for a specific application named "myapp".

A file in `/etc/pam.d/` named after a service defines the PAM rules for that
service.

## PAM Modules

- `pam_listfile` — restrict service access (e.g. SSH) for users/groups listed
  in an arbitrary file.
- `pam_cracklib` — enforce password complexity rules (minimum length, character
  classes, etc.).

## PAM Control Flags

- `sufficient` — if the module succeeds, authentication skips any subsequent
  modules and grants access; if it fails, the result is ignored and processing
  continues.

## Password Storage

Encrypted passwords should be stored in `/etc/shadow`, not `/etc/passwd`.
