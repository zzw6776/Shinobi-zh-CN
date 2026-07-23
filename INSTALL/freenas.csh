#!/bin/tcsh
echo "========================================================="
echo "==\!\! Shinobi : The Open Source CCTV and NVR Solution \!\!=="
echo "==================== FreeNAS Installer =================="
echo "========================================================="
echo "This is a touchless installer. No user input is required."
echo "Run this script as root inside your jail from the root of"
echo "the cloned git repository."
echo "============="
echo "Shinobi - Updating package repository"
pkg update -f
if ( ! -e "./conf.json" ) then
    cp conf.sample.json conf.json
endif
if ( ! -e "./super.json" ) then
    echo "============="
    echo "Default Superuser : admin@shinobi.video"
    echo "Default Password : admin"
    echo '* You can edit these settings in "super.json" located in the Shinobi directory.'
    cp super.sample.json super.json
endif
echo "============="
echo "Shinobi - Installing Node.js"
which node >& /dev/null
if ( $status != 0 ) then
    pkg install -y node npm
else
    echo "Node.js Found..."
    echo "Version : `node -v`"
endif
which npm >& /dev/null
if ( $status != 0 ) then
    pkg install -y npm
endif
which ffmpeg >& /dev/null
if ( $status != 0 ) then
    echo "============="
    echo "Shinobi - Installing FFMPEG"
    pkg install -y ffmpeg
else
    echo "FFmpeg Found..."
endif
echo "============="
echo "Shinobi - Installing MariaDB"
echo "MariaDB will be installed with no password."
which mysql >& /dev/null
if ( $status != 0 ) then
    pkg install -y mariadb1011-server mariadb1011-client
endif
sysrc mysql_enable=yes
service mysql-server start
echo "Waiting for MariaDB to start..."
set mariadbTries = 0
while ( $mariadbTries < 30 )
    mysql -u root -e "SELECT 1;" >& /dev/null
    if ( $status == 0 ) break
    @ mariadbTries++
    sleep 1
end
echo "============="
echo "Shinobi - Installing Database..."
mysql -u root -e "source sql/user.sql"
echo "============="
echo "Shinobi - Install NPM Libraries"
npm install --unsafe-perm
echo "============="
echo "Shinobi - Install PM2"
npm install pm2@latest -g
echo "Shinobi - Finished"
chmod -R 755 .
touch INSTALL/installed.txt
echo "Shinobi - Randomizing cron key"
set cronKey = `head -c 64 /dev/urandom | sha256 | awk '{print substr($NF,1,60)}'`
node tools/modifyConfiguration.js addToConfig='{"cron":{"key":"'$cronKey'"}}'
echo "Shinobi - Starting Shinobi and setting to start on boot"
pm2 start camera.js
#pm2 start cron.js
pm2 startup rcd
pm2 save
pm2 list
set ipaddress = `ifconfig | grep 'inet ' | awk '$2 != "127.0.0.1" {print $2}' | head -n 1`
echo "====================================="
echo "||=====   Install Completed   =====||"
echo "====================================="
echo "|| Login with the Superuser and create a new user\!\!"
echo "||==================================="
echo "|| Open http://${ipaddress}:8080/super in your web browser."
echo "||==================================="
echo "|| Default Superuser : admin@shinobi.video"
echo "|| Default Password : admin"
echo "====================================="
echo "====================================="
