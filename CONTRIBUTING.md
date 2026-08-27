# Contributing

Thanks for considering contributing to dsh-qq-notify!

## Development

```sh
npm install
npm test
```

The plugin is a standard DSH plugin: `lib/index.js` registers the tools via
`@deepseek-ai/dsh-tools`, `client.js` is the WebUI entry, and
`cordis.patch.yml` declares the bundle manifest consumed by
`dsh plugin --profile web add <this package>`.

## Releasing

1. Bump the version in `package.json` and add a `CHANGELOG.md` entry.
2. Push a tag: `git tag v<version> && git push --tags`.
3. Publish: `npm publish`.

## Notes

- Keep `qq-notify.config.json` (personal QQ numbers) out of version control —
  it is already listed in `.gitignore`.
- `napcat/` holds local runtime data and must never be committed.