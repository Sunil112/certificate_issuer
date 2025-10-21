#!/bin/bash

# Clean old artifacts
rm -rf channel-artifacts crypto-config

# Generate crypto material
cryptogen generate --config=crypto-config.yaml

# Create genesis block
mkdir channel-artifacts
configtxgen -profile EducationGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block

# Create channel config tx
configtxgen -profile EducationChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID education-channel

# Start network
docker-compose up -d

echo "Network started."
