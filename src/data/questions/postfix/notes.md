# Postfix — Study Notes

LPIC-2 Topic 211 (Email Services). Source: LKB-4 LPIC-2. Postfix.

## Key configuration

- `/etc/postfix/main.cf` — primary configuration file; holds most global settings
  including relay control parameters such as `mynetworks` and `relay_domains`.
- `mynetworks` — defines IP address ranges trusted to relay mail without
  authentication. Restrict it to reduce the risk of spam-relay abuse.
- `smtp_fallback_relay` — alternate (backup) relay used when delivery through the
  primary relay/destination fails.

## TLS directives

- `smtpd_tls_security_level = mandatory` — require TLS for all incoming SMTP
  connections.
- `smtpd_tls_key_file` — path to the server's private key for TLS.

## Queue management

- `postqueue -f` — flush the queue: process and deliver queued mail immediately.
