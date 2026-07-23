#!/bin/bash
DIR=$(cd "$(dirname "$0")" && pwd)
echo "========================================================="
echo "==!! Shinobi : The Open Source CCTV and NVR Solution !!=="
echo "==================== openSUSE Installer ================="
echo "========================================================="
echo "This is a touchless installer. No user input is required."
echo "============="
echo "Shinobi - Run zypper refresh"
sudo zypper refresh
echo "============="
echo "Shinobi - Installing tools"
sudo zypper install -y make gcc gcc-c++ cmake zip tar git curl dos2unix
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
    sudo zypper install -y nodejs22 npm22
else
    echo "Node.js Found..."
    echo "Version : $(node -v)"
fi
if ! [ -x "$(command -v npm)" ]; then
    sudo zypper install -y npm22
fi
if ! [ -x "$(command -v ffmpeg)" ]; then
    echo "============="
    echo "Shinobi - Installing FFMPEG"
    sudo zypper install -y ffmpeg
else
    echo "FFmpeg Found..."
    echo "Version : $(ffmpeg -version)"
fi
echo "============="
echo "Shinobi - Installing MariaDB"
echo "MariaDB will be installed with no password."
if ! [ -x "$(command -v mysql)" ]; then
    sudo zypper install -y mariadb mariadb-client
fi
#Start mysql and enable on boot
sudo systemctl start mariadb
sudo systemctl enable mariadb
echo "============="
echo "Shinobi - Installing Database..."
sudo mysql -e "source sql/user.sql" || true
echo "============="
echo "Shinobi - Install NPM Libraries"
sudo npm install --unsafe-perm
# sudo npm audit fix --force
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
