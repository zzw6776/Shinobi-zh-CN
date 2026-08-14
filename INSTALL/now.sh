#!/bin/bash
echo "Shinobi Installer"
echo "========"
echo "Select your OS"
echo "If your OS is not on the list please refer to the docs."
echo "========"
echo "1. Ubuntu - Fast and Touchless"
echo "2. Ubuntu - Advanced"
echo "3. Alma Linux 9.2 / Rocky 9 / CentOS 8 - Fast and Touchless (Red Hat)"
echo "4. CentOS"
echo "5. MacOS"
echo "6. FreeBSD"
echo "7. OpenSUSE"
echo "8. Arch Linux - Fast and Touchless"
echo "9. Bazzite / Fedora Atomic - Rootless Podman (Experimental)"
echo "========"
read oschoicee
case $oschoicee in
"1")
chmod +x INSTALL/ubuntu-touchless.sh
sh INSTALL/ubuntu-touchless.sh
  ;;
"2")
chmod +x INSTALL/ubuntu.sh
sh INSTALL/ubuntu.sh
  ;;
"3")
chmod +x INSTALL/rocky9-touchless.sh
sh INSTALL/rocky9-touchless.sh
  ;;
"4")
chmod +x "INSTALL/CentOS - Quick Install.sh"
sh "INSTALL/CentOS - Quick Install.sh" 1
  ;;
"5")
chmod +x INSTALL/macos.sh
sh INSTALL/macos.sh
  ;;
"6")
chmod +x INSTALL/freebsd.sh
sh INSTALL/freebsd.sh
  ;;
"7")
chmod +x INSTALL/opensuse.sh
sh INSTALL/opensuse.sh
  ;;
"8")
chmod +x INSTALL/arch.sh
bash INSTALL/arch.sh
  ;;
"9")
echo "========"
echo "EXPERIMENTAL : Bazzite and other Fedora Atomic systems are immutable, so"
echo "Shinobi is not installed onto the host. It runs as a rootless Podman"
echo "container managed by systemd, with all data kept in your home folder."
echo "This installer is new and less tested than the others."
echo "========"
printf "Continue? (y/N) : "
read bazziteConfirm
case $bazziteConfirm in
"y"|"Y"|"yes"|"YES")
chmod +x INSTALL/bazzite.sh
bash INSTALL/bazzite.sh
  ;;
*)
  echo "Cancelled."
  ;;
esac
  ;;

*)
  echo "Choice not found."
  ;;
esac
