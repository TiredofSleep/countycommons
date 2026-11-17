#!/bin/sh
# Run ON THE SERVER after adding a county site (a new subdomain).
#
# The HTTPS certificate lists every site name (up to 100 per certificate), and
# acme.sh renews it automatically over HTTP: Caddy serves the challenge files
# from /var/www/acme. A wildcard would need DNS changes at SiteGround on every
# renewal, which is why the old one lapsed on 2026-11-15.
#
#   sh pipeline/cert.sh          # show names missing from the certificate
#   sh pipeline/cert.sh --apply  # reissue with every current name, install, reload Caddy
set -e
cd /opt/countycommons
node -e "const r=require('./server/lib/tenant').registry();console.log(['countycommons.us','www.countycommons.us',...Object.values(r.tenants).map(t=>t.host)].join('\n'))" | sort -u > /tmp/cc-hosts.txt
n=$(wc -l < /tmp/cc-hosts.txt)
have=$(openssl x509 -in /etc/caddy/certs/countycommons.cer -noout -ext subjectAltName 2>/dev/null | tr ',' '\n' | sed -n 's/.*DNS://p' | sort -u)
missing=$(echo "$have" | comm -13 - /tmp/cc-hosts.txt)
echo "$n names on the site; missing from the certificate: ${missing:-none}"
[ "$n" -gt 100 ] && { echo "More than 100 names: split into two certificates before going on."; exit 1; }
[ "$1" = "--apply" ] || exit 0
[ -z "$missing" ] && { echo "Nothing to do."; exit 0; }
first=$(head -1 /tmp/cc-hosts.txt)
/root/.acme.sh/acme.sh --issue $(sed 's/^/-d /' /tmp/cc-hosts.txt) -w /var/www/acme --server letsencrypt --keylength ec-256 --force
/root/.acme.sh/acme.sh --install-cert -d "$first" --ecc --key-file /etc/caddy/certs/countycommons.key --fullchain-file /etc/caddy/certs/countycommons.cer \
  --reloadcmd "chown caddy:caddy /etc/caddy/certs/* && chmod 640 /etc/caddy/certs/* && systemctl reload caddy"
