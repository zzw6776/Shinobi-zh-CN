#!/bin/sh

# Copyright (c) 2020 Jordan Geoghegan <jordan@geoghegan.ca>

# Permission to use, copy, modify, and/or distribute this software for any
# purpose with or without fee is hereby granted, provided that the above
# copyright notice and this permission notice appear in all copies.

# THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
# REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
# AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
# INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
# LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
# OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
# PERFORMANCE OF THIS SOFTWARE.

DIR=$(cd "$(dirname "$0")" && pwd)
echo "========================================================="
echo "==!! Shinobi : The Open Source CCTV and NVR Solution !!=="
echo "==================== OpenBSD Installer =================="
echo "========================================================="
echo "This is a touchless installer. No user input is required."
echo "Run this script from the Shinobi directory as a user with"
echo "doas permissions."
echo "============="
if ! [ -x "$(command -v doas)" ]; then
    echo "doas is not available. Please configure /etc/doas.conf and try again."
    exit 1
fi
if ! doas true; then
    echo "doas is not enabled for $(whoami). Please check /etc/doas.conf. Exiting..."
    exit 1
fi
#create conf.json
if [ ! -e "./conf.json" ]; then
    cp conf.sample.json conf.json
fi
#create super.json
if [ ! -e "./super.json" ]; then
    echo "============="
    echo "Default Superuser : admin@shinobi.video"
    echo "Default Password : admin"
    echo "* You can edit these settings in \"super.json\" located in the Shinobi directory."
    cp super.sample.json super.json
fi
echo "============="
echo "Shinobi - Installing Node.js"
if ! [ -x "$(command -v node)" ]; then
    doas pkg_add node
else
    echo "Node.js Found..."
    echo "Version : $(node -v)"
fi
if ! [ -x "$(command -v ffmpeg)" ]; then
    echo "============="
    echo "Shinobi - Installing FFMPEG"
    doas pkg_add ffmpeg
else
    echo "FFmpeg Found..."
    echo "Version : $(ffmpeg -version)"
fi
echo "============="
echo "Shinobi - Installing MariaDB"
echo "MariaDB will be installed with no password."
if ! [ -x "$(command -v mysql)" ]; then
    doas pkg_add mariadb-server
    doas /usr/local/bin/mysql_install_db
fi
doas rcctl enable mysqld
doas rcctl start mysqld
#Wait for MariaDB to accept connections
echo "Waiting for MariaDB to start..."
mariadbTries=0
until doas mysql -u root -e "SELECT 1;" > /dev/null 2>&1; do
    mariadbTries=$((mariadbTries + 1))
    if [ "$mariadbTries" -gt 30 ]; then
        echo "MariaDB did not start in time. Continuing anyway..."
        break
    fi
    sleep 1
done
echo "============="
echo "Shinobi - Installing Database..."
doas mysql -u root -e "source sql/user.sql" || true
echo "============="
echo "Shinobi - Install NPM Libraries"
npm install --unsafe-perm
# npm audit fix --force
echo "============="
echo "Shinobi - Install PM2"
doas npm install pm2@latest -g
echo "Shinobi - Finished"
chmod -R 755 .
touch INSTALL/installed.txt
#Strip carriage returns from the CLI helper and link it into the PATH
tr -d '\r' < INSTALL/shinobi > INSTALL/shinobi.tmp && mv INSTALL/shinobi.tmp INSTALL/shinobi
chmod +x INSTALL/shinobi
doas ln -sf "$DIR/shinobi" /usr/local/bin/shinobi
echo "Shinobi - Randomizing cron key"
node tools/modifyConfiguration.js addToConfig="{\"cron\":{\"key\":\"$(head -c 64 < /dev/urandom | sha256 | awk '{print substr($NF,1,60)}')\"}}"
echo "Shinobi - Starting Shinobi and setting to start on boot"
pm2 start camera.js
#pm2 start cron.js
pm2 save
#pm2 startup does not support OpenBSD, use a crontab @reboot entry instead
( crontab -l 2>/dev/null | grep -v "pm2 resurrect" ; echo "@reboot /usr/local/bin/pm2 resurrect" ) | crontab -
pm2 list
echo "====================================="
echo "||=====   Install Completed   =====||"
echo "====================================="
echo "|| Login with the Superuser and create a new user!!"
echo "||==================================="
echo "|| Open http://$(ifconfig | grep 'inet ' | awk '!/127.0.0.1/ {print $2}' | head -n 1):8080/super in your web browser."
echo "||==================================="
echo "|| Default Superuser : admin@shinobi.video"
echo "|| Default Password : admin"
echo "====================================="
echo "====================================="
