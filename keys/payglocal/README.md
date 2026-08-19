# PayGlocal keys

Drop the two PEM files downloaded from the PayGlocal GCC portal here (they are
git-ignored via the root `*.pem` rule):

- The **merchant private key** (PKCS8 PEM) — file referenced by `PG_PRIVATE_KEY_PATH`.
- The **PayGlocal public certificate** (SPKI/X.509 PEM, named `..._payglocal_mid.pem`) — file
  referenced by `PG_PUBLIC_KEY_PATH`.

Both env vars in `.env.local` point at this folder by default. Once the files are in
place and `PAYGLOCAL_MODE=live`, `lib/payments/payglocal/config.ts` will load them at
runtime — nothing else needs to change.
