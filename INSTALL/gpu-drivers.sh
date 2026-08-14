#!/bin/bash
# Detects installed GPUs and suggests the drivers needed for
# hardware accelerated decoding and Object Detection.
# Can be run on its own : bash INSTALL/gpu-drivers.sh

suggestGpuDrivers() {
  if ! type lspci >/dev/null 2>&1; then
    return
  fi
  GPUS=$(lspci 2>/dev/null | grep -Ei 'vga compatible controller|3d controller|display controller')
  if [ -z "$GPUS" ]; then
    return
  fi
  HASNVIDIA=$(echo "$GPUS" | grep -ci 'nvidia')
  HASAMD=$(echo "$GPUS" | grep -Eci 'amd|advanced micro devices|ati ')
  HASINTEL=$(echo "$GPUS" | grep -ci 'intel')
  if [ "$HASNVIDIA" = "0" ] && [ "$HASAMD" = "0" ] && [ "$HASINTEL" = "0" ]; then
    return
  fi
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTROID=$ID
    DISTROLIKE=$ID_LIKE
  fi
  case "$DISTROID $DISTROLIKE" in
    *ubuntu*) PKGFAMILY="debian"; ISUBUNTU=1 ;;
    *debian*) PKGFAMILY="debian" ;;
    *rhel*|*fedora*|*centos*) PKGFAMILY="redhat" ;;
    *arch*) PKGFAMILY="arch" ;;
    *suse*) PKGFAMILY="suse" ;;
    *) PKGFAMILY="unknown" ;;
  esac
  echo "========"
  echo "GPU detected. Installing drivers enables hardware accelerated decoding and Object Detection."
  echo "$GPUS"
  echo "========"
  if [ "$HASNVIDIA" != "0" ]; then
    if [ "$ISUBUNTU" = "1" ]; then
      echo "NVIDIA : installing drivers with ubuntu-drivers"
      sudo ubuntu-drivers autoinstall
      echo "  For CUDA support run : sudo bash INSTALL/cuda.sh"
    else
      echo "NVIDIA : run the following to install CUDA and the NVIDIA driver"
      echo "  sudo bash INSTALL/cuda.sh"
      case $PKGFAMILY in
        "debian") echo "  (or) sudo apt install -y nvidia-driver" ;;
        "redhat") echo "  (or) sudo dnf install akmod-nvidia" ;;
        "arch") echo "  (or) sudo pacman -S nvidia nvidia-utils" ;;
        "suse") echo "  (or) sudo zypper install nvidia-video-G06" ;;
      esac
    fi
  fi
  if [ "$HASAMD" != "0" ]; then
    echo "AMD : install Mesa / VAAPI drivers"
    case $PKGFAMILY in
      "debian") echo "  sudo apt install -y mesa-va-drivers mesa-vdpau-drivers vainfo" ;;
      "redhat") echo "  sudo dnf install -y mesa-va-drivers mesa-vdpau-drivers libva-utils" ;;
      "arch") echo "  sudo pacman -S mesa libva-mesa-driver libva-utils" ;;
      "suse") echo "  sudo zypper install Mesa-libva libva-utils" ;;
      *) echo "  install the Mesa VAAPI drivers for your distro" ;;
    esac
  fi
  if [ "$HASINTEL" != "0" ]; then
    echo "Intel : install the Intel media / QuickSync drivers"
    case $PKGFAMILY in
      "debian") echo "  sudo apt install -y intel-media-va-driver-non-free i965-va-driver vainfo" ;;
      "redhat") echo "  sudo dnf install -y intel-media-driver libva-intel-driver libva-utils" ;;
      "arch") echo "  sudo pacman -S intel-media-driver libva-intel-driver libva-utils" ;;
      "suse") echo "  sudo zypper install intel-media-driver libva-utils" ;;
      *) echo "  install the Intel media driver for your distro" ;;
    esac
  fi
  echo "========"
  echo "A reboot may be required after installing GPU drivers."
  echo "========"
}

suggestGpuDrivers
