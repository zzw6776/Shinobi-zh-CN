#!/bin/bash
# Installs NVIDIA's FFmpeg build for Jetson (L4T) so the hardware decoders
# (h264_nvv4l2dec, mpeg2_nvv4l2dec, mpeg4_nvv4l2dec) are available. See #450.
#
# Exit code contract for callers:
#   0 = a Jetson was detected and NVIDIA FFmpeg was installed (do not fall back)
#   1 = not a Jetson (caller should install the standard ffmpeg instead)

# Detect a Jetson / L4T device (covers Nano and the rest of the Jetson line).
isJetson=false
if [ -f /etc/nv_tegra_release ]; then
    isJetson=true
elif [ -f /proc/device-tree/model ] && tr -d '\0' < /proc/device-tree/model | grep -qi "jetson"; then
    isJetson=true
fi

if [ "$isJetson" != "true" ]; then
    echo "Shinobi - Jetson not detected, using standard FFMPEG."
    exit 1
fi

echo "============="
echo "Shinobi - NVIDIA Jetson detected"
echo "Installing NVIDIA FFMPEG with nvv4l2 hardware decoders (issue #450)"
echo "============="

# Add the NVIDIA Jetson FFmpeg apt repository. On L4T the signing key is already
# trusted (jetson-ota-public), so no extra key import is required.
NVIDIA_FFMPEG_LIST=/etc/apt/sources.list.d/nvidia-l4t-ffmpeg.list
echo "deb https://repo.download.nvidia.com/jetson/ffmpeg main main" | sudo tee "$NVIDIA_FFMPEG_LIST"
echo "deb-src https://repo.download.nvidia.com/jetson/ffmpeg main main" | sudo tee -a "$NVIDIA_FFMPEG_LIST"

# Prefer NVIDIA's ffmpeg over the distro build so hardware decoding is used.
echo "Package: ffmpeg
Pin: origin repo.download.nvidia.com
Pin-Priority: 1001" | sudo tee /etc/apt/preferences.d/nvidia-l4t-ffmpeg > /dev/null

sudo apt update -y
sudo apt install -y ffmpeg

hasNvv4l2(){
    command -v ffmpeg > /dev/null 2>&1 && ffmpeg -hide_banner -decoders 2>/dev/null | grep -q "nvv4l2dec"
}

# The nvv4l2 decoders link against the Tegra libraries. Make sure the dynamic
# loader can find them for processes started outside a login shell (e.g. pm2).
TEGRA_LIB=/usr/lib/aarch64-linux-gnu/tegra
if [ -d "$TEGRA_LIB" ] && ! grep -rqs "$TEGRA_LIB" /etc/ld.so.conf.d/ 2>/dev/null; then
    echo "$TEGRA_LIB" | sudo tee /etc/ld.so.conf.d/shinobi-nvidia-tegra.conf > /dev/null
    sudo ldconfig
fi

if hasNvv4l2; then
    echo "Shinobi - NVIDIA Jetson FFMPEG ready. Hardware decoders available:"
    ffmpeg -hide_banner -decoders 2>/dev/null | grep "nvv4l2dec"
else
    echo "Shinobi - WARNING: ffmpeg installed but nvv4l2 hardware decoders were not found."
    echo "Shinobi - The camera can still run in software. To get hardware decoding, install"
    echo "Shinobi - NVIDIA's Jetson ffmpeg build manually (see issue #450)."
fi
# A Jetson-specific ffmpeg was installed either way, so tell the caller not to
# overwrite it with the standard build.
exit 0
