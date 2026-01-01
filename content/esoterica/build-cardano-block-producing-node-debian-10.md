---
draft: false
title: "How to Build a Cardano Block Producing Node (Debian Buster)"
date: 2021-07-01
description: "A guide for establishing a block-producing node for Cardano on Debian Buster."
tags: ["Blog", "Cardano", "Linux", "Tutorial"]
---

This comprehensive guide walks administrators through establishing a block-producing node for Cardano on Debian Buster. The tutorial assumes prior installation of cardano-cli and cardano-node binaries.

## System Update

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

## Add Cardano User

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

## Create Directories

```bash
mkdir -p /etc/cardano/
mkdir -p /etc/cardano/key/
mkdir -p /var/lib/cardano/
mkdir -p /tmp/cardano/
chown cardano:cardano /tmp/cardano
chown cardano:cardano /var/lib/cardano
```

## Clone Configuration Files

```bash
mkdir -p ~/src
cd ~/src
git clone https://github.com/input-output-hk/cardano-node.git
cp -R ~/src/cardano-node/configuration/cardano/* /etc/cardano/
rm -rf ~/src
```

## Topology Configuration

Edit `/etc/cardano/mainnet-topology.json`:

```json
{
  "Producers": [
    {
      "addr": "your-cardano-relay-0.domain.com",
      "port": 4020,
      "valency": 1
    },
    {
       "addr": "your-cardano-relay-1.domain.com",
       "port": 4020,
       "valency": 1
    }
  ]
}
```

## Required Key Files

Copy to `/etc/cardano/key/`:

- kes.skey
- kes.vkey
- node.cert
- vrf.skey
- vrf.vkey

## Set Permissions

```bash
chmod -R 660 /etc/cardano/key/*
chmod -R 400 /etc/cardano/key/*.skey
chown -R cardano:cardano /etc/cardano
```

## Producer Startup Script

Create `/usr/local/bin/cardano-producer-start.sh`:

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
--config /etc/cardano/mainnet-config.json \
--shelley-kes-key /etc/cardano/key/kes.skey \
--shelley-vrf-key /etc/cardano/key/vrf.skey \
--shelley-operational-certificate /etc/cardano/key/node.cert
```

Make executable:

```bash
touch /usr/local/bin/cardano-producer-start.sh
chmod 755 /usr/local/bin/cardano-producer-start.sh
```

## Systemd Service File

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
ExecStart       = /bin/bash -c '/usr/local/bin/cardano-producer-start.sh'
KillSignal=SIGINT
RestartKillSignal=SIGINT
TimeoutStopSec=5
LimitNOFILE=32768
Restart=always
RestartSec=7

[Install]
WantedBy= multi-user.target
```

## Launch Service

```bash
systemctl daemon-reload
systemctl enable cardano-node --now
```

## Verification

```bash
journalctl -u cardano -f
```
