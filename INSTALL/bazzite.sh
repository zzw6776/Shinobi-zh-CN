#!/bin/bash
# =========================================================
# ==!! Shinobi : The Open Source CCTV and NVR Solution !!==
# ================ Bazzite / Fedora Atomic ================
# =========================================================
#
# Bazzite is an immutable (rpm-ostree / bootc) operating system. /usr is
# read-only, there is no dnf/apt for the host, and anything layered with
# `rpm-ostree install` needs a reboot and slows down every future OS update.
# So this installer does NOT install Shinobi onto the host. It runs the
# official container image under rootless Podman and wires it into systemd
# with a Quadlet unit, keeping all state in $HOME where it survives an OS
# image update.
#
# Usage:
#   ./bazzite.sh              install (asks about GPU)
#   ./bazzite.sh --gpu        install with GPU passthrough, no prompt
#   ./bazzite.sh --no-gpu     install CPU-only, no prompt
#   ./bazzite.sh update       pull the latest image and restart
#   ./bazzite.sh uninstall    remove the service (keeps your recordings)
#   ./bazzite.sh uninstall --purge   also delete recordings and database
#
# Notes:
#   - Rootless Podman cannot bind ports below 1024, so the FTP port (21)
#     described in Docker/README.md is not available here. Port 8080 is.
#   - Volumes are mounted with :Z so SELinux relabels them for the container.
#
set -euo pipefail

IMAGE="registry.gitlab.com/shinobi-systems/shinobi:dev"
SERVICE_NAME="shinobi"
PORT="${SHINOBI_PORT:-8080}"
DATA_DIR="${SHINOBI_DATA_DIR:-$HOME/Shinobi}"
DB_DIR="${SHINOBI_DB_DIR:-$HOME/ShinobiDatabase}"
QUADLET_DIR="$HOME/.config/containers/systemd"
QUADLET_FILE="$QUADLET_DIR/${SERVICE_NAME}.container"
USE_GPU=""
PURGE="no"

say(){ echo "============="; echo "Shinobi - $1"; }
die(){ echo "ERROR: $1" >&2; exit 1; }

banner(){
    echo "========================================================="
    echo "==!! Shinobi : The Open Source CCTV and NVR Solution !!=="
    echo "================ Bazzite Installer ======================"
    echo "========================================================="
}

# ---------------------------------------------------------------- arguments
ACTION="install"
FORCE="no"
for arg in "$@"; do
    case "$arg" in
        install|update|uninstall) ACTION="$arg" ;;
        --gpu)     USE_GPU="yes" ;;
        --no-gpu)  USE_GPU="no" ;;
        --purge)   PURGE="yes" ;;
        --force)   FORCE="yes" ;;
        -h|--help) sed -n '2,29p' "$0"; exit 0 ;;
        *) die "Unknown argument: $arg (try --help)" ;;
    esac
done

# ------------------------------------------------------------ host checks
check_host(){
    [ -f /etc/os-release ] || die "Cannot read /etc/os-release. Is this Linux?"
    # shellcheck disable=SC1091
    . /etc/os-release

    local is_atomic="no"
    # /run/ostree-booted is a FILE (not a directory) created on every ostree
    # boot - it is the definitive marker for Bazzite/Bluefin/Silverblue/Kinoite.
    # ID is checked too because Bazzite sets ID=bazzite, not VARIANT_ID.
    if [ -e /run/ostree-booted ] \
        || [ "${ID:-}" = "bazzite" ] \
        || [ "${VARIANT_ID:-}" = "bazzite" ] \
        || command -v rpm-ostree >/dev/null 2>&1; then
        is_atomic="yes"
    fi

    echo "Detected OS : ${PRETTY_NAME:-$NAME}"

    if [ "$is_atomic" = "no" ] && [ "$FORCE" != "yes" ]; then
        echo ""
        echo "This does not look like Bazzite or another Fedora Atomic system."
        echo "For a traditional distro use the matching script in this folder"
        echo "(ubuntu.sh, arch.sh, opensuse.sh ...) which installs natively."
        echo "Re-run with --force to install the container anyway."
        exit 1
    fi

    command -v podman >/dev/null 2>&1 || die "podman not found. It ships with Bazzite - is this really Bazzite?"

    # Quadlet arrived in Podman 4.4. Bazzite is well past that, but a clear
    # message beats a confusing systemd failure later.
    local pmajor pminor pver
    pver="$(podman version --format '{{.Client.Version}}' 2>/dev/null || echo 0.0)"
    pmajor="${pver%%.*}"
    pminor="$(echo "$pver" | cut -d. -f2)"
    if [ "${pmajor:-0}" -lt 4 ] || { [ "${pmajor:-0}" -eq 4 ] && [ "${pminor:-0}" -lt 4 ]; }; then
        die "Podman $pver is too old for Quadlet. Need 4.4 or newer."
    fi
    echo "Podman version : $pver"

    if [ "$(id -u)" = "0" ]; then
        echo ""
        echo "WARNING: running as root. This installer is designed for rootless"
        echo "Podman under your normal user account. Continuing anyway."
    fi
}

# -------------------------------------------------------------- gpu prompt
detect_gpu(){
    local has_dri="no" has_nvidia="no" has_cdi="no"
    [ -d /dev/dri ] && has_dri="yes"
    command -v nvidia-smi >/dev/null 2>&1 && has_nvidia="yes"
    # CDI is how rootless Podman exposes NVIDIA devices.
    if [ -f /etc/cdi/nvidia.yaml ] || [ -f /var/run/cdi/nvidia.yaml ]; then
        has_cdi="yes"
    fi

    say "Checking hardware acceleration"
    echo "Render nodes (/dev/dri) : $has_dri"
    echo "NVIDIA driver (nvidia-smi) : $has_nvidia"
    echo "NVIDIA container CDI spec  : $has_cdi"

    if [ "$has_nvidia" = "yes" ] && [ "$has_cdi" = "no" ]; then
        echo ""
        echo "NOTE: An NVIDIA GPU is present but no CDI spec was found, so the"
        echo "      container cannot use it. On Bazzite this needs the -nvidia"
        echo "      image variant and nvidia-container-toolkit. VAAPI via"
        echo "      /dev/dri will still be offered below."
    fi

    if [ "$has_dri" = "no" ]; then
        echo ""
        echo "No /dev/dri found - hardware transcoding is not available."
        USE_GPU="no"
        return
    fi

    if [ -n "$USE_GPU" ]; then
        echo ""
        echo "GPU passthrough : $USE_GPU (set by flag)"
        return
    fi

    # Piped installs (curl | bash) have no tty to prompt on.
    if [ ! -t 0 ]; then
        echo ""
        echo "Not an interactive shell - defaulting to CPU only."
        echo "Re-run with --gpu to enable passthrough."
        USE_GPU="no"
        return
    fi

    echo ""
    echo "Shinobi can use your GPU for video decoding/transcoding, which cuts"
    echo "CPU usage substantially when you run several cameras."
    read -r -p "Enable GPU passthrough (/dev/dri)? [Y/n] " reply
    case "${reply:-Y}" in
        [Nn]*) USE_GPU="no" ;;
        *)     USE_GPU="yes" ;;
    esac
    echo "GPU passthrough : $USE_GPU"
}

# ------------------------------------------------------------ config seeding
# conf.json and super.json are bind-mounted as single FILES so they survive an
# image update. Podman creates a directory in place of a missing bind source,
# which would break the container, so seed them from the samples in the image
# before the unit ever starts.
seed_config(){
    say "Preparing configuration"
    mkdir -p "$DATA_DIR/videos" "$DB_DIR"

    local f
    for f in conf super; do
        if [ -s "$DATA_DIR/${f}.json" ]; then
            echo "Keeping existing ${f}.json"
            continue
        fi
        # A directory here means a previous run let Podman auto-create one.
        [ -d "$DATA_DIR/${f}.json" ] && rmdir "$DATA_DIR/${f}.json" 2>/dev/null
        echo "Creating ${f}.json from the image's sample"
        podman run --rm --entrypoint cat "$IMAGE" "/home/Shinobi/${f}.sample.json" \
            > "$DATA_DIR/${f}.json"
        [ -s "$DATA_DIR/${f}.json" ] || die "Could not seed ${f}.json from the image"
    done
}

# ------------------------------------------------------------- unit writing
write_quadlet(){
    say "Writing Quadlet unit"
    mkdir -p "$QUADLET_DIR" "$DATA_DIR" "$DB_DIR"

    local gpu_lines=""
    if [ "$USE_GPU" = "yes" ]; then
        # Rootless access to the render node relies on your user being in the
        # render/video group, which is the default on Bazzite.
        gpu_lines="AddDevice=/dev/dri"
    fi

    cat > "$QUADLET_FILE" <<EOF
# Generated by Shinobi INSTALL/bazzite.sh
# Rendered into a systemd service by the Podman Quadlet generator.
# Edit and run: systemctl --user daemon-reload && systemctl --user restart ${SERVICE_NAME}
[Unit]
Description=Shinobi CCTV and NVR
After=network-online.target
Wants=network-online.target

[Container]
Image=${IMAGE}
ContainerName=${SERVICE_NAME}
PublishPort=${PORT}:8080
# Mount only the paths that hold state. Do NOT mount over /home/Shinobi itself:
# the image's entrypoint IS /home/Shinobi/Docker/init.sh, so a bind mount there
# shadows the whole application and the container dies with exit 127.
# :Z lets SELinux relabel these for the container. Without it the container
# gets permission denied on files that look perfectly fine from the host.
Volume=${DATA_DIR}/videos:/home/Shinobi/videos:Z
Volume=${DATA_DIR}/conf.json:/home/Shinobi/conf.json:Z
Volume=${DATA_DIR}/super.json:/home/Shinobi/super.json:Z
Volume=${DB_DIR}:/var/lib/mysql:Z
Environment=TZ=$(timedatectl show -p Timezone --value 2>/dev/null || echo UTC)
${gpu_lines}

[Service]
Restart=always
# First run pulls a large image; don't let systemd give up on it.
TimeoutStartSec=900

[Install]
WantedBy=default.target
EOF

    echo "Wrote $QUADLET_FILE"
}

# ---------------------------------------------------------------- lifecycle
enable_linger(){
    # Without linger, user services stop when you log out - fatal for an NVR.
    if loginctl show-user "$USER" -p Linger --value 2>/dev/null | grep -q "yes"; then
        echo "Linger already enabled for $USER"
    else
        say "Enabling linger so Shinobi runs without a login session"
        loginctl enable-linger "$USER" || \
            echo "WARNING: could not enable linger. Shinobi will stop when you log out."
    fi
}

# Opening the port needs root, so this is the one step that may ask for your
# password. If sudo is unavailable or refused, fall back to printing the command
# rather than failing the install - Shinobi still works from the local machine.
open_firewall(){
    if ! command -v firewall-cmd >/dev/null 2>&1; then
        echo "firewalld not present - nothing to open."
        return 0
    fi

    say "Firewall"

    if sudo -n firewall-cmd --list-ports 2>/dev/null | grep -qw "${PORT}/tcp" \
        || firewall-cmd --list-ports 2>/dev/null | grep -qw "${PORT}/tcp"; then
        echo "Port ${PORT}/tcp is already open."
        return 0
    fi

    local sudo_cmd=""
    if [ "$(id -u)" = "0" ]; then
        sudo_cmd=""
    elif sudo -n true 2>/dev/null; then
        sudo_cmd="sudo"
    elif [ -t 0 ]; then
        echo "Opening port ${PORT}/tcp so other devices on your LAN can reach Shinobi."
        echo "This needs root - you may be asked for your password."
        sudo_cmd="sudo"
    else
        echo "Cannot open the firewall automatically (no interactive sudo)."
        echo "Run this yourself to allow LAN access:"
        echo "    sudo firewall-cmd --permanent --add-port=${PORT}/tcp && sudo firewall-cmd --reload"
        return 0
    fi

    if $sudo_cmd firewall-cmd --permanent --add-port="${PORT}/tcp" >/dev/null 2>&1 \
        && $sudo_cmd firewall-cmd --reload >/dev/null 2>&1; then
        echo "Opened port ${PORT}/tcp permanently."
    else
        echo "Could not open the firewall. Run this yourself to allow LAN access:"
        echo "    sudo firewall-cmd --permanent --add-port=${PORT}/tcp && sudo firewall-cmd --reload"
    fi
}

close_firewall(){
    command -v firewall-cmd >/dev/null 2>&1 || return 0
    firewall-cmd --list-ports 2>/dev/null | grep -qw "${PORT}/tcp" || return 0
    local sudo_cmd="sudo"
    [ "$(id -u)" = "0" ] && sudo_cmd=""
    sudo -n true 2>/dev/null || [ -t 0 ] || return 0
    if $sudo_cmd firewall-cmd --permanent --remove-port="${PORT}/tcp" >/dev/null 2>&1 \
        && $sudo_cmd firewall-cmd --reload >/dev/null 2>&1; then
        echo "Closed port ${PORT}/tcp."
    fi
}

wait_for_shinobi(){
    say "Waiting for Shinobi to answer on port ${PORT}"
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "http://localhost:${PORT}"; then
            echo "Shinobi is up."
            return 0
        fi
        sleep 5
    done
    echo "Shinobi did not answer within 5 minutes."
    echo "Check the logs with: journalctl --user -u ${SERVICE_NAME} -f"
    return 1
}

do_install(){
    banner
    check_host
    detect_gpu

    say "Pulling image (this is large, be patient)"
    podman pull "$IMAGE"

    seed_config
    write_quadlet
    enable_linger

    say "Starting service"
    systemctl --user daemon-reload
    systemctl --user restart "${SERVICE_NAME}.service"

    wait_for_shinobi || true
    open_firewall

    echo ""
    echo "========================================================="
    echo "Shinobi is installed."
    echo ""
    echo "  Open       : http://localhost:${PORT}"
    echo "  Superuser  : http://localhost:${PORT}/super"
    echo "               admin@shinobi.video / admin"
    echo ""
    echo "  Recordings : ${DATA_DIR}/videos"
    echo "  Config     : ${DATA_DIR}/conf.json"
    echo "  Database   : ${DB_DIR}"
    echo ""
    echo "  Logs       : journalctl --user -u ${SERVICE_NAME} -f"
    echo "  Restart    : systemctl --user restart ${SERVICE_NAME}"
    echo "  Stop       : systemctl --user stop ${SERVICE_NAME}"
    echo "  Update     : $0 update"
    echo ""
    echo "Change the default superuser password before exposing this to a network."
    echo "========================================================="
}

do_update(){
    banner
    [ -f "$QUADLET_FILE" ] || die "Shinobi is not installed (no $QUADLET_FILE)"
    say "Pulling latest image"
    podman pull "$IMAGE"
    say "Restarting"
    systemctl --user daemon-reload
    systemctl --user restart "${SERVICE_NAME}.service"
    wait_for_shinobi || true
    echo "Update complete. Old image layers can be cleaned with: podman image prune"
}

do_uninstall(){
    banner
    say "Stopping service"
    systemctl --user stop "${SERVICE_NAME}.service" 2>/dev/null || true

    if [ -f "$QUADLET_FILE" ]; then
        rm -f "$QUADLET_FILE"
        systemctl --user daemon-reload
        echo "Removed $QUADLET_FILE"
    else
        echo "No Quadlet unit found."
    fi

    close_firewall

    if [ "$PURGE" = "yes" ]; then
        echo ""
        echo "--purge will PERMANENTLY DELETE:"
        echo "    $DATA_DIR   (config and all recordings)"
        echo "    $DB_DIR     (database)"
        if [ -t 0 ]; then
            read -r -p "Type DELETE to confirm: " reply
            if [ "$reply" = "DELETE" ]; then
                rm -rf "$DATA_DIR" "$DB_DIR"
                echo "Deleted."
            else
                echo "Not confirmed - your data was left alone."
            fi
        else
            echo "Refusing to purge without an interactive confirmation."
        fi
    else
        echo ""
        echo "Your recordings and database were left in place:"
        echo "    $DATA_DIR"
        echo "    $DB_DIR"
        echo "Re-run with --purge to delete them."
    fi
    echo "Uninstall complete."
}

case "$ACTION" in
    install)   do_install ;;
    update)    do_update ;;
    uninstall) do_uninstall ;;
esac
