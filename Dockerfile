ARG BASE_IMAGE=node:22-bookworm-slim
FROM ${BASE_IMAGE}

ARG DEBIAN_FRONTEND=noninteractive \
    EXCLUDE_DB=false

ENV DB_USER=majesticflame \
    DB_PASSWORD='' \
    DB_HOST='localhost' \
    DB_DATABASE=ccio \
    DB_PORT=3306 \
    DB_TYPE='mysql' \
    SUBSCRIPTION_ID=sub_XXXXXXXXXXXX \
    PLUGIN_KEYS='{}' \
    SSL_ENABLED='false' \
    SSL_COUNTRY='CA' \
    SSL_STATE='BC' \
    SSL_LOCATION='Vancouver' \
    SSL_ORGANIZATION='Shinobi Systems' \
    SSL_ORGANIZATION_UNIT='IT Department' \
    SSL_COMMON_NAME='nvr.ninja'

WORKDIR /home/Shinobi
COPY . ./

RUN apt-get update -y
RUN apt-get upgrade -y

RUN apt-get install -y \
        wget \
        curl \
        net-tools \
        software-properties-common \
        build-essential \
        git \
        python3 \
        sudo \
        pkg-config \
        apt-utils \
        yasm \
        bzip2 \
        coreutils \
        procps \
        gnutls-bin \
        nasm \
        tar \
        make \
        g++ \
        gcc \
        tini \
        tar

RUN sh /home/Shinobi/Docker/install_ffmpeg.sh
RUN sh /home/Shinobi/Docker/install_mariadb.sh
RUN sh /home/Shinobi/Docker/install_nodejs.sh

# security: was chmod 777 / chmod -R 777 (world-writable) — the container runs everything as
# root already, so nothing needs the world-write bit; 777 only added risk (any locally-running
# process, or an RCE bug elsewhere, could rewrite Shinobi's own source / plugin files)
RUN chmod 755 /home/Shinobi
RUN chmod -R 755 /home/Shinobi/plugins
RUN chmod -f +x /home/Shinobi/Docker/init.sh

RUN sed -i -e 's/\r//g' /home/Shinobi/Docker/init.sh

RUN apt-get update -y --fix-missing
RUN apt-get upgrade -y

# The startup files must live OUTSIDE /home/Shinobi. That path is a documented
# mount point, and a bind mount of an empty host directory hides everything the
# image put there -- including the entrypoint itself, which used to fail with a
# bare "exec /home/Shinobi/Docker/init.sh failed: No such file or directory".
RUN mkdir -p /usr/local/share/shinobi \
    && cp /home/Shinobi/Docker/init.sh /usr/local/bin/shinobi-init.sh \
    && cp /home/Shinobi/Docker/pm2.yml /usr/local/share/shinobi/pm2.yml \
    && chmod 755 /usr/local/bin/shinobi-init.sh

# Pristine copy of the application, used to seed an empty /home/Shinobi bind
# mount on first start. Note this DOES grow the image (~890MB measured): the
# hardlinks land in a new overlayfs layer, which forces a copy-up of every file
# from the layers below, so -al saves nothing here. The cost is deliberate --
# it is what makes the documented "-v $HOME/Shinobi:/home/Shinobi" run command
# work against a new host directory.
RUN cp -al /home/Shinobi /opt/shinobi-defaults

VOLUME ["/home/Shinobi"]
VOLUME ["/var/lib/mysql"]

EXPOSE 8080 443 21 25

# Run under tini as PID 1 so orphaned/reparented child processes (e.g. ffmpeg
# left behind when a camera thread is force-killed) are reaped instead of
# piling up as <defunct> zombies over time. (#461)
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/shinobi-init.sh"]

CMD [ "pm2-docker", "/usr/local/share/shinobi/pm2.yml" ]
