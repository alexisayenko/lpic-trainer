# NFS — Study Notes

LPIC-2 topic — NFS (Network File System).

## Files

- `/etc/fstab` — filesystem mount table; used to mount NFS shares at boot.
- `/etc/exports` — defines directories exported by the NFS server and per-host options.
- `/proc/mounts` — kernel-maintained list of all currently mounted filesystems.
- `/etc/hosts.deny` — TCP Wrappers file used to deny access to services.

## Services

- **portmapper.service** — maps RPC services to ports (required for NFSv2/v3).
- **mountd** — manages mount requests from NFS clients; checks them against `/etc/exports`.

## Utilities

- `exportfs -a` — (export all) ensures that all entries in `/etc/exports` are actively exported.
- `exportfs -l` — list of exported systems.
- `exportfs -r` — re-export all directories.
- `exportfs -ar` — re-export all directories, applying `/etc/exports` changes without restarting NFS.
- `nfsstat -s` — print server-side statistics.
- `rpcinfo -p localhost` — list registered RPC services on the local host.
- `showmount -a` — show directories currently being shared, in `host:dir` format.

## NFSv3 vs NFSv4

- NFSv4 integrates the mount protocol, removing the need for a separate mountd service.
- NFSv4 supports ACLs for more granular permission control than traditional UNIX permissions.

## Mount options

- **hard** — client retries indefinitely until the server responds (good for temporary outages).
- **soft** — client fails after a set number of retries (operations return an error instead of hanging).
