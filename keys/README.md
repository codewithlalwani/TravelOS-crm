# PayGlocal PEM Keys Directory

Place your key files in this directory:

## Required Files

| File | Description |
|------|-------------|
| `payglocal_public.pem` | PayGlocal's RSA public key (for JWE encryption of outbound payloads). Provided by PayGlocal during onboarding. |
| `merchant_private.pem` | Your merchant RSA private key (for JWS signing). You generate this; register the corresponding public key with PayGlocal. |

## Generating Your Merchant Key Pair

```bash
# Generate 2048-bit RSA private key
openssl genrsa -out merchant_private.pem 2048

# Extract the public key (share THIS with PayGlocal, keep private key secret)
openssl rsa -in merchant_private.pem -pubout -out merchant_public.pem
```

## ⚠️ Security Notes

- **NEVER commit PEM files to git.** The `.gitignore` should exclude `*.pem`.
- Keep `merchant_private.pem` strictly on the server.
- On Hostinger, upload these files outside the `public_html` directory if possible, and update the paths in `payglocal.config.php`.
- Set file permissions to `600` (owner read/write only): `chmod 600 *.pem`

## Updating Paths

If you move the key files, update these constants in `../payglocal.config.php`:

```php
define('PAYGLOCAL_ENC_KEY_PATH', '/absolute/path/to/payglocal_public.pem');
define('PAYGLOCAL_SIG_KEY_PATH', '/absolute/path/to/merchant_private.pem');
```
