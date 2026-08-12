#!/bin/bash
DIR=$(cd "$(dirname "$0")" && pwd)
echo "========================================================="
echo "==!! Shinobi : The Open Source CCTV and NVR Solution !!=="
echo "=============== Mac OS Installer (Docker) ==============="
echo "========================================================="
echo "This is a touchless installer. No user input is required."
echo "Shinobi will be built and run as a Docker container."
echo "Run this script as a regular user, not with sudo."
echo "============="
if [ "$(id -u)" = "0" ]; then
    echo "Do not run this installer as root or with sudo."
    echo "Docker Desktop and Homebrew must be run as a regular user."
    exit 1
fi
#Detect macOS Version and CPU Architecture
echo "============="
echo " Detecting macOS Version and CPU Architecture"
echo "============="
macosVersion=$(sw_vers -productVersion)
#hw.optional.arm64 is reliable even when the shell runs under Rosetta
if [ "$(sysctl -n hw.optional.arm64 2>/dev/null)" = "1" ]; then
    dockerPlatform="linux/arm64"
    echo " macOS Version: $macosVersion (Apple Silicon / ARM)"
else
    dockerPlatform="linux/amd64"
    echo " macOS Version: $macosVersion (Intel / x86_64)"
fi
echo " Docker platform: $dockerPlatform"
echo "============="
#Install Docker Desktop if missing
if ! [ -x "$(command -v docker)" ]; then
    echo "Shinobi - Installing Docker Desktop"
    #Install Homebrew if missing
    if ! [ -x "$(command -v brew)" ]; then
        echo "============="
        echo "Shinobi - Installing Homebrew"
        echo "============="
        NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    #Load Homebrew into this shell (Apple Silicon or Intel prefix)
    if [ -x /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -x /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    if ! [ -x "$(command -v brew)" ]; then
        echo "Homebrew installation failed. Cannot continue."
        exit 1
    fi
    brew install --cask docker
    #Docker Desktop places the CLI here
    export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin"
fi
if ! [ -x "$(command -v docker)" ]; then
    echo "Docker installation failed. Cannot continue."
    exit 1
fi
#Start Docker Desktop if the daemon is not running
if ! docker info > /dev/null 2>&1; then
    echo "============="
    echo "Shinobi - Starting Docker Desktop"
    echo "If this is the first launch you may need to accept the"
    echo "Docker service agreement in the window that opens."
    open -a Docker
    dockerTries=0
    until docker info > /dev/null 2>&1; do
        dockerTries=$((dockerTries + 1))
        if [ "$dockerTries" -gt 180 ]; then
            echo "Docker did not start in time. Open Docker Desktop,"
            echo "accept the service agreement and run this installer again."
            exit 1
        fi
        sleep 1
    done
fi
echo "============="
echo "Shinobi - Locating Shinobi source"
#The Shinobi git repository is the Docker build context.
#Use the checkout this script lives in, otherwise clone from git
#into the Applications folder.
sourceDir=$(dirname "$DIR")
if [ ! -e "$sourceDir/Dockerfile" ]; then
    sourceDir="/Applications/Shinobi"
    if [ ! -e "$sourceDir/Dockerfile" ]; then
        echo "Cloning Shinobi from git into $sourceDir..."
        #/Applications is writable by admin group users, fall back to sudo
        git clone https://gitlab.com/Shinobi-Systems/Shinobi.git "$sourceDir" || {
            sudo git clone https://gitlab.com/Shinobi-Systems/Shinobi.git "$sourceDir" &&
            sudo chown -R "$(whoami)" "$sourceDir"
        } || exit 1
    fi
fi
echo "Source : $sourceDir"
echo "============="
echo "Shinobi - Building Docker image ($dockerPlatform)"
docker build --platform "$dockerPlatform" --tag shinobi-image:latest "$sourceDir" || exit 1
#create conf.json
if [ ! -e "$sourceDir/conf.json" ]; then
    cp "$sourceDir/conf.sample.json" "$sourceDir/conf.json"
fi
#create super.json
if [ ! -e "$sourceDir/super.json" ]; then
    echo "============="
    echo "Default Superuser : admin@shinobi.video"
    echo "Default Password : admin"
    echo "* You can edit these settings in \"super.json\" located in the Shinobi directory."
    cp "$sourceDir/super.sample.json" "$sourceDir/super.json"
fi
#Database files persist here on the host
mkdir -p "$HOME/ShinobiDatabase"
#Replace any existing Shinobi container. Recordings, configuration
#and the database live in the mounted host folders and are kept.
if docker ps -a --format '{{.Names}}' | grep -qx "Shinobi"; then
    echo "============="
    echo "Shinobi - Removing existing Shinobi container"
    docker stop Shinobi > /dev/null 2>&1
    docker rm Shinobi > /dev/null 2>&1
fi
echo "============="
echo "Shinobi - Creating and starting the Shinobi container"
#The named volume keeps the node_modules built into the image from
#being hidden by the source folder mounted over /home/Shinobi.
docker run -d \
    --name Shinobi \
    --platform "$dockerPlatform" \
    --restart unless-stopped \
    --shm-size=1g \
    -p 8080:8080 \
    -v "$sourceDir":/home/Shinobi \
    -v shinobi-node-modules:/home/Shinobi/node_modules \
    -v "$HOME/ShinobiDatabase":/var/lib/mysql \
    shinobi-image:latest || exit 1
touch "$DIR/installed.txt"
docker ps --filter "name=Shinobi"
echo "====================================="
echo "||=====   Install Completed   =====||"
echo "====================================="
echo "|| Login with the Superuser and create a new user!!"
echo "||==================================="
echo "|| Open http://$(ifconfig | sed -En 's/127.0.0.1//;s/.*inet (addr:)?(([0-9]*\.){3}[0-9]*).*/\2/p' | head -n 1):8080/super in your web browser."
echo "||==================================="
echo "|| Default Superuser : admin@shinobi.video"
echo "|| Default Password : admin"
echo "||==================================="
echo "|| The container starts with Docker Desktop automatically."
echo "|| Manage it with: docker stop Shinobi / docker start Shinobi"
echo "|| Logs : docker logs Shinobi"
echo "====================================="
echo "====================================="
