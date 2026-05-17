# BIND9 — Study Notes

Source: LPIC-2 topic 207 (Domain Name Server) study documents.

## DNSSEC

- Provides authenticity and integrity of DNS data.
- Protects against DNS spoofing / cache poisoning attacks.
- DNS-based Authentication of Named Entities (DANE) builds on DNSSEC and is used to publish valid TLS certificates for a service.
- Signs DNS data with cryptographic signatures.

## TSIG (Transaction Signatures)

- Authenticates zone transfer requests between DNS servers.
- Provides transaction-level authentication using shared secret keys.
- Servers using TSIG must have synchronized clocks (time-stamped signatures).
- TSIG keys are defined in `key {}` blocks in `named.conf`.

## Key files and directories

- `/etc/named.conf` — primary BIND configuration file (global server settings).
- `/var/named/` — default location for zone files.
- `/usr/bin/dnssec-signzone` — signs a zone using the zone's database file as input.
- `/usr/bin/dnssec-keygen` — generates DNSSEC keys: KSK (Key Signing Key) and ZSK (Zone Signing Key).
- `/usr/bin/named-checkzone {zonename} {filename}` — checks zone file syntax and integrity.

## named.conf directives

```
allow-transfer { 192.168.0.10; };   # restrict zone transfers to listed hosts
allow-query { ...; };                # restrict which hosts may query
recursion no;                        # authoritative answers only, no recursive queries
forwarders { 192.168.0.4; };         # upstream servers for unresolved queries
forward first;                       # try forwarders first, then recurse
masterfile-format text|raw;          # master file format (raw = binary, faster load)
directory "/working/dir/for/named/process";   # working directory for named
file "/path/to/zonefile";            # path to a zone's data file
blackhole { ...; };                  # never answer queries from listed hosts
listen-on port 53 { 127.0.0.1; };    # restrict listening addresses
```

## Zone types

- `type master;` — authoritative primary for the zone.
- `type slave;` — secondary; obtains data from a master via zone transfer.
- `type hint;` — root hints (named.ca); used by caching-only servers.
- `type forward;` — forwards queries for the zone.

## Resource records

- `A` — maps a hostname to an IPv4 address.
- `AAAA` — maps a hostname to an IPv6 address.
- `PTR` — reverse mapping (IP address to hostname), used in `in-addr.arpa` zones.
- `CNAME` — canonical name (alias).
- `MX` — mail exchange; identifies the mail server (with a priority value).
- `NS` — name server; delegates a zone/subdomain.
- `SOA` — start of authority; responsible-person email uses a dot instead of `@`
  (e.g. `fred.example.com.` means `fred@example.com`).

A subdomain delegation (`imbrium IN NS dns1.imbrium.luna.edu.`) requires a glue
`A` record for the named server.

Reverse-zone names must end with a trailing `.` to be fully qualified; otherwise
the zone origin is appended.

## SOA record example

```
example.net. IN SOA dns.pangaea.edu. fred.example.com. (
        7        ; serial
        3600     ; refresh
        600      ; retry
        604800   ; expire
        86400 )  ; default_ttl
```

## Reverse zone example

```
zone "1.168.192.in-addr.arpa" {
        type master;
        file "named.192.168.1";
};
```

## Running BIND securely

- Run as a dedicated, unprivileged server-specific system account, not root.
  Example `/etc/passwd` entry: `named:x:125:129:DNS BIND User:/var/named:/bin/false`
  (the `/bin/false` shell prevents login).
- Run inside a chroot jail / cage so a compromise cannot reach the rest of the system.
  Invoke with `named -t /var/named/root -u nobody` (`-t` chroot dir, `-u` user).
  `/var/named` is typically duplicated inside the chroot environment.

## Operations

- Reload config and zone files without restarting:
  - `rndc reload`
  - `killall -HUP named`
  - `kill -s SIGHUP <pid>`
- Reload a single zone: `rndc reload example.com`
- Clear the cache: `rndc flush`
- Default log file for resolution problems: `/var/log/messages`.

## Diagnostic tools

- `dig` — DNS lookup utility.
- `nslookup` — interactive DNS lookup utility.

## Split DNS

- Split-horizon configuration: name resolution differs depending on the
  requester's location (internal vs external view).

## Caching / forwarding

- A caching DNS server speeds up repeated lookups (helps when an upstream
  server is reliable but slow).
- A forward-only configuration is often faster than full recursion because
  the forwarder likely has answers already cached.

## Alternate name servers to BIND

- **dnsmasq** — lightweight DNS forwarder and DHCP server for small local
  networks that need both DNS and DHCP.
- **PowerDNS** — provides flexibility with different data sources (backends).
- **Exim** — a mail transfer agent (alternative to sendmail), noted for
  flexibility and ease of configuration.
