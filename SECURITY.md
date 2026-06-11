# Security Policy

`wcpay` handles WooCommerce REST API credentials and payments data. Please report
vulnerabilities responsibly.

## Reporting a vulnerability

Report security issues through Automattic's HackerOne program:
<https://hackerone.com/automattic>

Please do not open public GitHub issues for security problems.

## Scope notes

- Credentials are stored in the OS keychain by default; the file fallback
  (`WCPAY_KEYRING=0`) is opt-in and documented as sensitive.
- Live stores are read-only by design. Anything that lets a write reach a
  live-mode store, or leaks credentials/secrets in output, is in scope and high
  severity.
