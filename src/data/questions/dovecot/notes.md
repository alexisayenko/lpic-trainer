# Dovecot — Study Notes

LPIC-2 Topic 211 (Email Services). Source: LKB-2 LPIC-2. Dovecot.

## Commands

- `doveconf mail_location` — get the effective value of a parameter.
- `doveconf -n` — print non-default settings; useful to check config validity
  (throws an error on problematic configuration).
- `doveadm search -u johndoe uid` — find the current UIDs of mails in a mailbox.
- `doveadm mailbox status "messages vsize" "*" -A` — list all mailboxes for all
  users with message count and size (vsize), e.g. to sort by size.

## Primary configuration file

`/etc/dovecot/dovecot.conf` — main config file. Often contains version info at
the top of an unaltered default file. Protocols are enabled/disabled here.

Example directives:

    auth_verbose = yes        # enforce logging for authentication failures
    ssl_protocols = !SSLv3    # disable SSLv3
    ssl = required            # secured retrieval
    protocols = imap pop3     # enable IMAP and POP3
    ssl_key =                 # path to private key for TLS

## Notes

- The `vacation` Dovecot Sieve extension sets up automatic out-of-office replies.
