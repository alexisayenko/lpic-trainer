import type { Question } from '../types';

export const QUESTIONS: Question[] = [
  // 207 — Domain Name Server
  {
    id: 'dns-01',
    topic: 'domain-name-server',
    prompt: 'Which BIND configuration directive sets the directory used for relative paths to zone files?',
    choices: ['root-dir', 'directory', 'zone-path', 'workdir'],
    answerIndex: 1,
    explanation: 'The "directory" option in named.conf options{} block sets the working directory; relative zone-file paths resolve from it.',
  },
  {
    id: 'dns-02',
    topic: 'domain-name-server',
    prompt: 'Which DNS record type maps an IPv6 address to a hostname (forward lookup)?',
    choices: ['A', 'AAAA', 'PTR', 'CNAME'],
    answerIndex: 1,
    explanation: 'AAAA ("quad-A") records hold IPv6 forward mappings. A is IPv4 forward, PTR is reverse, CNAME is an alias.',
  },
  {
    id: 'dns-03',
    topic: 'domain-name-server',
    prompt: 'Which command reloads BIND zone files without restarting the daemon?',
    choices: ['named -HUP', 'rndc reload', 'systemctl reload-zones bind', 'dig +reload'],
    answerIndex: 1,
    explanation: 'rndc is the BIND control utility. "rndc reload" rereads named.conf and changed zone files.',
  },

  // 208 — Web Services
  {
    id: 'web-01',
    topic: 'web-services',
    prompt: 'In Apache httpd, which directive enables name-based virtual hosts on port 443?',
    choices: ['Listen 443', 'NameVirtualHost *:443', '<VirtualHost *:443>', 'ServerName *:443'],
    answerIndex: 2,
    explanation: 'In Apache 2.4 NameVirtualHost is deprecated — defining multiple <VirtualHost *:443> blocks with distinct ServerName values is sufficient.',
  },
  {
    id: 'web-02',
    topic: 'web-services',
    prompt: 'Which nginx directive forwards requests to an upstream backend?',
    choices: ['forward_pass', 'proxy_pass', 'upstream_pass', 'route_to'],
    answerIndex: 1,
    explanation: 'proxy_pass <url> in a location{} block forwards the request to the named upstream or URL.',
  },
  {
    id: 'web-03',
    topic: 'web-services',
    prompt: 'Which Apache directive controls which SSL/TLS protocol versions are accepted?',
    choices: ['SSLEngine', 'SSLProtocol', 'SSLCipherSuite', 'SSLOptions'],
    answerIndex: 1,
    explanation: 'SSLProtocol (e.g. "SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1") whitelists/blacklists protocol versions.',
  },

  // 209 — File Sharing
  {
    id: 'fs-01',
    topic: 'file-sharing',
    prompt: 'Which Samba parameter controls the workgroup or NT-domain the server announces?',
    choices: ['netbios name', 'workgroup', 'realm', 'domain master'],
    answerIndex: 1,
    explanation: 'The "workgroup" global parameter in smb.conf sets the workgroup (or short NetBIOS domain name).',
  },
  {
    id: 'fs-02',
    topic: 'file-sharing',
    prompt: 'Which file declares which directories an NFS server exports?',
    choices: ['/etc/nfs.conf', '/etc/exports', '/etc/fstab', '/etc/nfsd.exports'],
    answerIndex: 1,
    explanation: '/etc/exports lists exported paths and per-client options. exportfs -ra reloads it.',
  },
  {
    id: 'fs-03',
    topic: 'file-sharing',
    prompt: 'Which command lists active SMB sessions and locked files on a Samba server?',
    choices: ['smbstatus', 'smbclient -L', 'testparm', 'nmblookup'],
    answerIndex: 0,
    explanation: 'smbstatus reports connected users, shares in use, and currently locked files.',
  },

  // 210 — Network Client Management
  {
    id: 'ncm-01',
    topic: 'network-client-management',
    prompt: 'Which ISC DHCP directive sets the lease time a client should request by default?',
    choices: ['lease-time', 'default-lease-time', 'dhcp-lease', 'lease default'],
    answerIndex: 1,
    explanation: 'default-lease-time (and max-lease-time as the upper bound) belong in dhcpd.conf, in seconds.',
  },
  {
    id: 'ncm-02',
    topic: 'network-client-management',
    prompt: 'In OpenLDAP, which schema attribute uniquely identifies a posixAccount entry?',
    choices: ['cn', 'uid', 'uidNumber', 'dn'],
    answerIndex: 2,
    explanation: 'uidNumber is the numeric POSIX UID required by the posixAccount object class. uid is the login name; dn is the directory path.',
  },
  {
    id: 'ncm-03',
    topic: 'network-client-management',
    prompt: 'Which PAM module type runs after successful authentication to set up the user session (mounts, logging, limits)?',
    choices: ['auth', 'account', 'password', 'session'],
    answerIndex: 3,
    explanation: 'PAM has four module types: auth, account, password, session. session runs at login/logout for environment setup and teardown.',
  },

  // 211 — Email Services
  {
    id: 'email-01',
    topic: 'email-services',
    prompt: 'Which Postfix configuration parameter lists the domains the server considers local?',
    choices: ['mydestination', 'mynetworks', 'relay_domains', 'local_recipient_maps'],
    answerIndex: 0,
    explanation: 'mydestination enumerates domains delivered locally. mynetworks is for trusted client IPs; relay_domains for transit.',
  },
  {
    id: 'email-02',
    topic: 'email-services',
    prompt: 'Which Dovecot setting selects the on-disk format used for user mailboxes?',
    choices: ['mail_storage', 'mail_location', 'mailbox_format', 'mail_path'],
    answerIndex: 1,
    explanation: 'mail_location (e.g. "maildir:~/Maildir" or "mbox:/var/mail/%u") tells Dovecot where and in what format mail is stored.',
  },
  {
    id: 'email-03',
    topic: 'email-services',
    prompt: 'Which command shows the Postfix mail queue?',
    choices: ['mailq', 'postcat', 'postfix status', 'postsuper -l'],
    answerIndex: 0,
    explanation: 'mailq (equivalent to "postqueue -p") prints the queued messages. postcat dumps a single message; postsuper manages queue files.',
  },

  // 212 — System Security
  {
    id: 'sec-01',
    topic: 'system-security',
    prompt: 'Which iptables target masquerades source addresses on outgoing packets, suitable for a dynamic-IP NAT gateway?',
    choices: ['SNAT', 'DNAT', 'MASQUERADE', 'REDIRECT'],
    answerIndex: 2,
    explanation: 'MASQUERADE rewrites the source to the outgoing interface’s current address — ideal when the WAN IP can change. SNAT requires a fixed IP.',
  },
  {
    id: 'sec-02',
    topic: 'system-security',
    prompt: 'Which OpenSSH server directive disables password authentication while keeping public-key auth?',
    choices: ['PermitRootLogin no', 'PasswordAuthentication no', 'ChallengeResponseAuthentication no', 'UsePAM no'],
    answerIndex: 1,
    explanation: 'PasswordAuthentication no in sshd_config blocks plain-password logins; PubkeyAuthentication yes (default) keeps key-based logins working.',
  },
  {
    id: 'sec-03',
    topic: 'system-security',
    prompt: 'In OpenVPN, which configuration directive selects routed (layer 3) mode rather than bridged (layer 2)?',
    choices: ['dev tap', 'dev tun', 'mode routed', 'proto udp'],
    answerIndex: 1,
    explanation: '"dev tun" creates a routed IP tunnel; "dev tap" creates a layer-2 ethernet bridge endpoint.',
  },
];
