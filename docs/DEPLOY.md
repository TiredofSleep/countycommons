# DEPLOY.md — putting Clark Commons on a VPS

The whole site is one Node process reading JSON and PDFs from disk. Any small
VPS (1 vCPU / 1 GB) runs it comfortably. The boring, proven setup: systemd
keeps the process alive; Caddy terminates HTTPS automatically.

## One-time setup (Ubuntu/Debian VPS)

```bash
# 1. Node 20+ and git
sudo apt update && sudo apt install -y nodejs npm git

# 2. Get the code (until a remote exists: rsync/scp the project folder up,
#    excluding node_modules; then on the box:)
cd /opt/clark-commons && npm install --omit=dev

# 3. The site password (soft launch). Either file or env — file shown:
printf 'PASSWORD-HERE' > /opt/clark-commons/config/site-password
#    Remove the file (or unset SITE_PASSWORD) at public launch → site opens
#    and robots.txt flips to allow crawling automatically.

# 4. systemd unit
sudo tee /etc/systemd/system/clark-commons.service > /dev/null <<'EOF'
[Unit]
Description=Clark Commons civic transparency site
After=network.target

[Service]
WorkingDirectory=/opt/clark-commons
ExecStart=/usr/bin/node server/app.js
Restart=always
RestartSec=3
Environment=PORT=3000
# Environment=SITE_PASSWORD=...   (alternative to the config file)
User=www-data

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now clark-commons

# 5. Caddy (automatic HTTPS; replace the domain)
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
yourdomain.org {
    reverse_proxy localhost:3000
    encode gzip
}
EOF
sudo systemctl restart caddy
```

Point the domain's A record at the VPS IP; Caddy fetches certificates itself.

## Updating the live site

The corpus only changes when files change, so deployment is file sync:

```bash
# The live flow (as actually deployed): updates travel through the public repo.
# The box's only local changes are server-generated artifacts (every county's
# verification.json, the activity anchor, package-lock), so discard them all
# before pulling — then re-run the verifier for each county.
git push
ssh -i ~/.ssh/countycommons root@134.209.120.2 \
  'cd /opt/countycommons \
   && git checkout -- . \
   && git pull \
   && node pipeline/verify.js \
   && node pipeline/verify.js data/corpus-garlandar \
   && systemctl restart countycommons'
```

The verifier runs before restart on purpose — a corpus that doesn't
cross-foot should never go live. The two `git checkout` files are
server-regenerated artifacts; discard the server's copies before pulling
or the pull refuses. The production activity chain lives only on the
server (gitignored); its public witness travels the OTHER way — run
`node pipeline/anchor.js` on the box, scp `activity-anchor.json` down,
commit and push it. Anchor after any notable activity, at least weekly.

## Reading support messages

The /feedback drop-box saves notes and screenshots as private files in
`data/feedback/` on the server (gitignored, never served over HTTP).
Read them:

```bash
ssh -i ~/.ssh/countycommons root@134.209.120.2 'cd /opt/countycommons && node pipeline/feedback.js'
```

Pull a screenshot down to look at it:

```bash
scp -i ~/.ssh/countycommons root@134.209.120.2:/opt/countycommons/data/feedback/FILENAME .
```

After a note is handled, archive or delete its pair of files on the box.

## Pre-public-launch checklist

- [ ] Set `contact_email` in config/county.json (corrections line appears in
      the footer automatically once set)
- [ ] Decide the funding disclosure wording (`sponsor_line` in county.json)
- [ ] Read every page once, out loud, as a neighbor would
- [ ] Show it privately to the city manager, sheriff, fire chief (spec §16.5)
- [ ] Remove the site password → robots.txt opens automatically
- [ ] `curl -s https://yourdomain.org/health` → `ok`

## What this setup deliberately lacks

No database, no analytics, no cookies except the gate cookie, no third-party
requests, no user data. Backups = the git repository plus the inbox/ archive;
copy them anywhere. If the VPS dies, a fresh one is the one-time setup again.
