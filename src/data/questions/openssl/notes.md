# OpenSSL — Study Notes

## `openssl req` option reference

Annotated breakdown of the `openssl req` options used for certificate requests and self-signed certificates:

| Option | Meaning |
| --- | --- |
| `req` | Start a certificate request (CSR) generation process. |
| `-new` | Create a new certificate request. |
| `-newkey rsa:2048` | Generate a new RSA private key of 2048 bits. |
| `-days 365` | The certificate will be valid for 365 days. |
| `-nodes` | "No DES" – do not encrypt the private key (no passphrase). |
| `-key` | Use an existing private key. |
| `-keyout server.key` | Save the newly created private key to `server.key`. |
| `-out server.crt` | Save the output (CSR or self-signed certificate) to the named file. |
| `-x509` | Output a self-signed certificate instead of a CSR. |
| `-sha256` | Use the SHA-256 message digest. |

### Common command patterns

- CSR from an existing key: `openssl req -new -key server.key -out server.csr`
- CSR plus a new key: `openssl req -new -newkey rsa:2048 -nodes -keyout server.key -out server.csr`
- Self-signed certificate directly (no separate CSR): `openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout privateKey.key -out certificate.crt`
