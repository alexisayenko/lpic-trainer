# Samba — Study Notes

LPIC-2 topic 209.1 — Samba Server Configuration.

## Daemons

- **smbd** — Server Message Block daemon; handles file and printer access. Each connected client gets an extra copy of smbd.
- **nmbd** — NetBIOS Name Service daemon; acts as a WINS server.
- **winbindd** — handles domain membership and user/group resolution from a Windows domain.

## Ports

- TCP/139 — file and printer sharing
- UDP/139 — name translation, browsing the network
- UDP/137 — name service requests
- UDP/138 — datagram services

## Tools

- **smbstatus** — report on current Samba connections.
- **testparm** — check an smb.conf configuration file for internal correctness.
- **smbpasswd** — change a user's SMB password.
- **nmblookup** — query NetBIOS names and map them to IP addresses in a network.
- **smbclient** — a client that can connect to an SMB/CIFS server.
- **samba-tool** — main administration tool available with Samba 4.
- **net** — remote administration tool.
- **smbmount** — (obsolete) mount file systems shared over SMB.

## Configuration

- `/etc/samba/smb.conf` — main configuration file ([global] and per-share sections).
- `/etc/samba/smbpasswd` — encrypted passwords.

## Logs

- `/var/log/samba/log.nmbd`
- `/var/log/samba/log.smbd`
- Logs may also appear as `nmbd.log` / `smbd.log` within `/var/log/samba/`.
