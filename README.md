# County Commons

Free, sourced civic information for every U.S. county: where the money goes, line by line, every number linked to the public record it came from — plus petitions residents can sign and carry to their own officials.

- Live: [countycommons.us](https://countycommons.us) · the fullest county site is [Clark County, Arkansas](https://clarkar.countycommons.us)
- **Copy it for your county:** [COPY-THIS.md](COPY-THIS.md) (also at [/copy](https://clarkar.countycommons.us/copy) on any county site)
- **License:** code under [MIT](LICENSE); data and site text under [CC BY 4.0](DATA-LICENSE.md). Residents' personal information is never published or included.
- What this project will never do: [NEVER.md](NEVER.md) · Threat model: [SECURITY.md](SECURITY.md) · Why it exists: [THE-STORY.md](THE-STORY.md)

One Node.js process, server-rendered HTML, JSON files on disk, one small server. Each county is a settings file in `config/` and a data folder in `data/`.

```
npm install
npm start
```

Started by Brayden Sanders. Sponsored by Ozark Cleaners.
