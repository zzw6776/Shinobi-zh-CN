#!/bin/sh
DIR=$(cd "$(dirname "$0")" && pwd)
echo "========================================================="
echo "==!! Shinobi : The Open Source CCTV and NVR Solution !!=="
echo "==================== FreeBSD Installer =================="
echo "========================================================="
echo "This is a touchless installer. No user input is required."
echo "Run this script as root inside your jail from the root of"
echo "the cloned git repository."
echo "============="
if [ "$(id -u)" != "0" ]; then
    echo "Please run this installer as root."
    exit 1
fi
echo "Shinobi - Updating package repository"
pkg update -f
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
    pkg install -y node npm
else
    echo "Node.js Found..."
    echo "Version : $(node -v)"
fi
if ! [ -x "$(command -v npm)" ]; then
    pkg install -y npm
fi
if ! [ -x "$(command -v ffmpeg)" ]; then
    echo "============="
    echo "Shinobi - Installing FFMPEG"
    pkg install -y ffmpeg
else
    echo "FFmpeg Found..."
    echo "Version : $(ffmpeg -version)"
fi
echo "============="
echo "Shinobi - Installing MariaDB"
echo "MariaDB will be installed with no password."
if ! [ -x "$(command -v mysql)" ]; then
    pkg install -y mariadb1011-server mariadb1011-client
fi
#Start mysql and enable on boot
sysrc mysql_enable=yes
service mysql-server start
#Wait for MariaDB to accept connections
echo "Waiting for MariaDB to start..."
mariadbTries=0
until mysql -u root -e "SELECT 1;" > /dev/null 2>&1; do
    mariadbTries=$((mariadbTries + 1))
    if [ "$mariadbTries" -gt 30 ]; then
        echo "MariaDB did not start in time. Continuing anyway..."
        break
    fi
    sleep 1
done
echo "============="
echo "Shinobi - Installing Database..."
mysql -u root -e "source sql/user.sql" || true
echo "============="
echo "Shinobi - Install NPM Libraries"
npm install --unsafe-perm
# npm audit fix --force
echo "============="
echo "Shinobi - Install PM2"
npm install pm2@latest -g
echo "Shinobi - Finished"
chmod -R 755 .
touch INSTALL/installed.txt
#Strip carriage returns from the CLI helper and link it into the PATH
tr -d '\r' < INSTALL/shinobi > INSTALL/shinobi.tmp && mv INSTALL/shinobi.tmp INSTALL/shinobi
chmod +x INSTALL/shinobi
ln -sf "$DIR/shinobi" /usr/local/bin/shinobi
echo "Shinobi - Randomizing cron key"
node tools/modifyConfiguration.js addToConfig="{\"cron\":{\"key\":\"$(head -c 64 < /dev/urandom | sha256 | awk '{print substr($NF,1,60)}')\"}}"
echo "Shinobi - Starting Shinobi and setting to start on boot"
pm2 start camera.js
#pm2 start cron.js
pm2 startup rcd
pm2 save
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
