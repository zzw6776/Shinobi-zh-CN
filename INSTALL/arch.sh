#!/bin/bash
DIR=$(cd "$(dirname "$0")" && pwd)
echo "========================================================="
echo "==!! Shinobi : The Open Source CCTV and NVR Solution !!=="
echo "=================== Arch Linux Installer ================"
echo "========================================================="
echo "This is a touchless installer. No user input is required."
echo "============="
echo "Shinobi - Synchronizing package databases"
sudo pacman -Sy --noconfirm
echo "============="
echo "Shinobi - Installing tools"
sudo pacman -S --needed --noconfirm base-devel cmake zip tar git curl dos2unix
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
    sudo pacman -S --needed --noconfirm nodejs npm
else
    echo "Node.js Found..."
    echo "Version : $(node -v)"
fi
if ! [ -x "$(command -v npm)" ]; then
    sudo pacman -S --needed --noconfirm npm
fi
if ! [ -x "$(command -v ffmpeg)" ]; then
    echo "============="
    echo "Shinobi - Installing FFMPEG"
    sudo pacman -S --needed --noconfirm ffmpeg
else
    echo "FFmpeg Found..."
    echo "Version : $(ffmpeg -version)"
fi
echo "============="
echo "Shinobi - Installing MariaDB"
echo "MariaDB will be installed with no password."
if ! [ -x "$(command -v mysql)" ] && ! [ -x "$(command -v mariadb)" ]; then
    sudo pacman -S --needed --noconfirm mariadb mariadb-clients
fi
#Initialize the MariaDB data directory (Arch does not do this automatically)
if [ ! -d "/var/lib/mysql/mysql" ]; then
    sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
fi
#Start mysql and enable on boot
sudo systemctl enable mariadb
sudo systemctl start mariadb
#Wait for MariaDB to accept connections
echo "Waiting for MariaDB to start..."
mariadbTries=0
until sudo mysql -e "SELECT 1;" > /dev/null 2>&1; do
    mariadbTries=$((mariadbTries + 1))
    if [ "$mariadbTries" -gt 30 ]; then
        echo "MariaDB did not start in time. Continuing anyway..."
        break
    fi
    sleep 1
done
echo "============="
echo "Shinobi - Installing Database..."
sudo mysql -e "source sql/user.sql" || true
echo "============="
echo "Shinobi - Install NPM Libraries"
sudo npm install --unsafe-perm
if ! [ -x "$(command -v ffmpeg)" ]; then
    echo "============="
    echo "Shinobi - FFmpeg still not found, installing static binaries from ffbinaries"
    sudo npm install ffbinaries
fi
echo "============="
echo "Shinobi - Install PM2"
sudo npm install pm2@latest -g
echo "Shinobi - Finished"
sudo chmod -R 755 .
touch INSTALL/installed.txt
dos2unix INSTALL/shinobi
chmod +x INSTALL/shinobi
sudo ln -sf "$DIR/shinobi" /usr/bin/shinobi
echo "Shinobi - Randomizing cron key"
node tools/modifyConfiguration.js addToConfig="{\"cron\":{\"key\":\"$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}')\"}}"
if [ -x "$(command -v firewall-cmd)" ]; then
    echo "============="
    echo "Shinobi - Creating firewall rule for port 8080"
    sudo firewall-cmd --permanent --add-port=8080/tcp -q
    sudo firewall-cmd --reload -q
fi
echo "Shinobi - Starting Shinobi and setting to start on boot"
sudo pm2 start camera.js
#sudo pm2 start cron.js
sudo pm2 startup
sudo pm2 save
sudo pm2 list
echo "====================================="
echo "||=====   Install Completed   =====||"
echo "====================================="
echo "|| Login with the Superuser and create a new user!!"
echo "||==================================="
echo "|| Open http://$(ip -4 -o addr show scope global | awk '{print $4}' | cut -d/ -f1 | head -n 1):8080/super in your web browser."
echo "||==================================="
echo "|| Default Superuser : admin@shinobi.video"
echo "|| Default Password : admin"
echo "====================================="
echo "====================================="
