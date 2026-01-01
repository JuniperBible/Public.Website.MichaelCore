---
draft: false
title: "How to Build a Cardano Relay Node (Debian Buster)"
date: 2021-06-15
description: "A comprehensive guide for setting up a Cardano relay node on Debian Buster."
tags: ["Blog", "Cardano", "Linux", "Tutorial"]
---

This guide walks through setting up a Cardano relay node on Debian Buster. This is part of a series focused on building Cardano Stake Pool infrastructure, following the tutorial on compiling Cardano node binaries.

## Prerequisites

This guide assumes you have already compiled and installed Cardano binaries to `/usr/local/bin` and installed all required dependencies on your Debian Buster system.

## System Updates

```bash
apt update -y
apt upgrade -y
apt dist-upgrade -y
apt autoremove -y
shutdown -r now
```

## Swap Space Configuration

```bash
swapon --show
fallocate -l 10G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
swapon --show
shutdown -r now
swapon --show
```

## User Account Creation

Create a dedicated system user for running the Cardano node:

```bash
adduser \
    --system \
    --shell /bin/bash \
    --gecos 'Cardano Node' \
    --group \
    --disabled-password \
    --home /home/cardano \
    cardano
```

## Verify Installation

```bash
cardano-cli version
cardano-node version
```

## Directory Setup

```bash
mkdir -p /etc/cardano/
mkdir -p /var/lib/cardano/
mkdir -p /tmp/cardano/
chown cardano:cardano /tmp/cardano
chown cardano:cardano /var/lib/cardano
```

## Configuration File Preparation

```bash
mkdir -p ~/src
cd ~/src
git clone https://github.com/input-output-hk/cardano-node.git
cp -R ~/src/cardano-node/configuration/cardano/* /etc/cardano/
rm -rf ~/src
chown -R cardano:cardano /etc/cardano
```

## Relay Node Topology

Edit `/etc/cardano/mainnet-topology.json`:

```json
{
  "Producers": [
    {
      "addr": "your-cardano-producer.domain.com",
      "port": 4020,
      "valency": 1
    },
    {
      "addr": "relays-new.cardano-mainnet.iohk.io",
      "port": 3001,
      "valency": 4
    }
  ]
}
```

## Startup Script

Create `/usr/local/bin/cardano-relay-start.sh`:

```bash
#!/bin/bash
mkdir -p /tmp/cardano/
chown cardano:cardano /tmp/cardano

export CARDANO_NODE_SOCKET_PATH="/tmp/cardano/cardano-node.socket"
/usr/local/bin/cardano-node run \
--topology /etc/cardano/mainnet-topology.json \
--database-path /var/lib/cardano \
--socket-path /tmp/cardano/cardano-node.socket \
--host-addr 0.0.0.0 \
--port 4020 \
--config /etc/cardano/mainnet-config.json
```

Create and permission the script:

```bash
touch /usr/local/bin/cardano-relay-start.sh
chmod 755 /usr/local/bin/cardano-relay-start.sh
```

## Systemd Service

Create `/etc/systemd/system/cardano-node.service`:

```ini
[Unit]
Description     = Cardano node service
Wants           = network-online.target
After           = network-online.target

[Service]
User            = cardano
Type            = simple
WorkingDirectory= /home/cardano
ExecStart       = /bin/bash -c '/usr/local/bin/cardano-relay-start.sh'
KillSignal=SIGINT
RestartKillSignal=SIGINT
TimeoutStopSec=5
LimitNOFILE=32768
Restart=always
RestartSec=7

[Install]
WantedBy= multi-user.target
```

## Service Activation

```bash
systemctl daemon-reload
systemctl enable cardano-node --now
```

## Startup Verification

```bash
journalctl -u cardano -f
```
