# 212.1 Configuring a router — Notes

Source: LKB-212.1 "Configuring a router" study PDF. This document contains only
scenario Q&A; no separate preface or syntax reference section is present.

## Key concepts covered

- **IP forwarding** — the kernel parameter `net.ipv4.ip_forward` controls whether
  the host forwards packets between interfaces.
  - Temporary: `sysctl -w net.ipv4.ip_forward=1` or
    `echo 1 > /proc/sys/net/ipv4/ip_forward`.
  - Persistent: set `net.ipv4.ip_forward` to `1` in `/etc/sysctl.conf`.
- **iptables chains** — `INPUT` (traffic to the host), `OUTPUT` (traffic from the
  host), `FORWARD` (traffic routed through the host).
- **Default policy** — `iptables -P INPUT DROP` sets the chain's default policy.
  When the INPUT policy is DROP, a rule allowing loopback (`localhost`) traffic is
  needed because many applications use the loopback interface for inter-process
  communication.
- **Saving / restoring rules** (Debian/Ubuntu):
  - `iptables-save > /etc/iptables/rules.v4` — dump rules to a file.
  - `iptables-restore < /etc/iptables/rules.v4` — load rules from a file.
- **Port redirection** — the `REDIRECT` target with `--to-port` redirects traffic
  to another port on the local machine.
