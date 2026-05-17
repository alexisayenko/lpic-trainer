# LPIC-2: OpenLDAP — Study Notes

## ldapdelete

Removes entries from the LDAP directory.

- `-D binddn` — bind DN.
- `-W` — prompt for the password associated with the bind DN.
- `-x` — use simple authentication instead of SASL.

## ldapsearch

```
ldapsearch [options] filter [attrs]
```

Options:

- `-b searchbase` — search base DN.
- `-x` — use simple authentication instead of SASL.
- `-LLL` — suppress LDIF version, comments, and search result references.

Filter examples:

- `"(sn=Smith)"`
- `(objectClass=person)`
- `"(mail=*@techcorp.com)"`
- `"uid=john"`

Attrs examples (limit returned attributes):

- `cn`
- `mail`

If no attributes are specified, all attributes are returned.

## ldapadd

Adds entries to the LDAP directory.

- `-f ldif-file` — input LDIF file.
- `-W` — prompt for simple authentication.
- `-x` — use simple authentication instead of SASL.

## ldappasswd

Changes the password of an LDAP entry.

- `-A` — prompt for the old password.
- `-S` — prompt for the new password (entered twice for confirmation).

## ldapmodify

Modifies existing entries in the LDAP directory.

## nsswitch.conf

The `hosts:` line (e.g. `hosts: files dns ldap`) defines the order of host
lookup sources. Including LDAP unnecessarily can cause slow logins when DNS
lookups fail or are slow and the system then falls back to LDAP.
