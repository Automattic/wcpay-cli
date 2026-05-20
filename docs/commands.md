# Command Reference

This file is a hand-written placeholder. It should eventually be generated or checked against command metadata.

## Core

```bash
wcpay auth add
wcpay auth list
wcpay auth test [profile]
wcpay auth remove <profile>
wcpay profile use <profile>
wcpay whoami
wcpay doctor
wcpay mode
```

## API

```bash
wcpay api <method> <path> [fields...]
```

## Reads

```bash
wcpay account status
wcpay settings get
wcpay transactions list
wcpay transactions get <id>
wcpay deposits list
wcpay deposits get <id>
wcpay disputes list
wcpay disputes get <id>
wcpay charges get <id>
```

## Test/dev-mode writes

```bash
wcpay test order create --product <id> --quantity <n>
wcpay test payment create --order <id> --scenario <scenario>
wcpay refunds create --order <id> --amount <minor-units>
wcpay authorizations capture --order <id> --intent <payment-intent-id>
wcpay authorizations cancel --order <id> --intent <payment-intent-id>
```

## Agent tooling

```bash
wcpay tools describe
wcpay tools schema
wcpay mcp
```
