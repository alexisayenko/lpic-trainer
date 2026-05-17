# 212.3 Secure Shell (SSH) — Notes

Sources: LKB-212.3 "Secure shell (SSH)" and LKB-4 "LPIC-2. SSH" study PDFs.

## Syntax reference (from LKB-4 cheat sheet)

### Client side

    /usr/bin/ssh -i id_newkey user@server
    /usr/bin/ssh admin@192.168.1.10
    /usr/bin/ssh-keygen -t rsa

    ~/.ssh/authorized_keys

### Server side

    /usr/bin/sshd -V

    /etc/ssh/sshd_config
      Port 2222
      Protocol 2
      PermitRootLogin no
      AllowUsers johndoe
      DenyUsers johndoe
      AllowGroups johndoegroup

    /etc/ssh/ssh_host_dsa_key.pub
    /etc/ssh/ssh_host_rsa_key

## Key concepts

- **`ssh -i <keyfile>`** — selects the private key (identity file) for
  public-key authentication.
- **`ssh user@host`** — connects to `host` as `user`.
- **`ssh-keygen -t rsa`** — generates an RSA key pair.
- **`sshd -V`** — prints the installed OpenSSH server version.

### sshd_config directives

- `Port` — port the SSH daemon listens on (default 22).
- `Protocol 2` — restricts to SSH protocol version 2 (more secure than v1).
- `PermitRootLogin no` — disables direct root login over SSH.
- `AllowUsers` — whitespace-separated list of users permitted to log in; users
  not listed are denied.
- `DenyUsers` — list of users explicitly denied SSH access.
- `AllowGroups` — restricts login to members of the listed groups.

### Host keys (in /etc/ssh/)

- `ssh_host_rsa_key` / `ssh_host_dsa_key` — server private host keys.
- `ssh_host_rsa_key.pub` / `ssh_host_dsa_key.pub` — corresponding public keys.

### Password-less authentication

- Place a user's public key in their `~/.ssh/authorized_keys` file on the server.

### Best practice

- Before restarting the SSH service after config changes, open a second SSH
  session from another device so you can revert if the change breaks access.
