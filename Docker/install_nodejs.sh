#!/bin/sh
if [ -x "$(command -v node)" ]; then
    echo "Node.js detected. Version : $(node -v)"
else
    echo "Installing Node.js 22"
    mkdir -p /etc/apt/keyrings
    apt-get install -y ca-certificates gnupg
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

    apt-get update -y --fix-missing
    apt-get upgrade -y
    apt-get install nodejs -y
fi

if [ -x "$(command -v npm)" ]; then
    echo "NPM detected. Version : $(npm -v)"
fi

# Make npm resilient to transient network failures (ECONNRESET / aborted
# downloads) that otherwise abort the whole image build on flaky or proxied
# connections. Without retries a single dropped connection during the large
# dependency install fails the build outright. See issue #531.
npm config set fetch-retries 5
npm config set fetch-retry-factor 2
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm config set fetch-timeout 600000

npm install --unsafe-perm $([ `dpkg --print-architecture` = "arm64" ] && echo --maxsockets 1)
npm i pm2@latest -g
npm i pg
