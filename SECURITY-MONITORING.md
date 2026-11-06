# Security Vulnerability Monitoring

## Remaining vulnerabilities (blocked by upstream)

| Package | Current | Fixed in | Vulnerability | Blocked by |
|---|---|---|---|---|
| `minimatch` | 10.2.6 | 11.0.1 | GHSA-g3hv-75wg-m249 (DoS via globparts amplification) | `@typescript-eslint/typescript-estree@8.72.1` (latest) pins `minimatch@^10.2.2` |
| `sharp` | 0.34.5 | 0.35.5 | GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c, GHSA-wq5f-xc86-pv6w (native libvips CVEs) | `kokoro-js@1.2.1` (latest) pins `@huggingface/transformers@^3.5.1` → `sharp@^0.34.1` |

## What to watch for

1. **`@typescript-eslint` new release** — when `typescript-estree` bumps its `minimatch` dependency to `^11.x`, run `bun audit fix --latest` to upgrade minimatch to 11.0.1+.

2. **`kokoro-js` new release** — when `kokoro-js` drops its dependency on `@huggingface/transformers@^3.x` (or upgrades to `^4.x`), `sharp` can move to 0.35.5+. Watch the [kokoro-js repo](https://github.com/hexagrame/kokoro-js) for a release that updates transformers.

## Manual check script

Run this to see if updates are available:

```bash
bun outdated @typescript-eslint/typescript-estree @typescript-eslint/eslint-plugin @typescript-eslint/parser @typescript-eslint/utils kokoro-js @huggingface/transformers minimatch sharp
```

Once upstream releases are out:

```bash
bun update @typescript-eslint/* kokoro-js @huggingface/transformers minimatch sharp
bun audit fix --latest
```

## Status

- **64 → 4 vulnerabilities fixed** (all fixable ones resolved)
- **4 remaining** require upstream maintainer releases
- TypeScript compiles cleanly (only 7 pre-existing errors unrelated to security)
