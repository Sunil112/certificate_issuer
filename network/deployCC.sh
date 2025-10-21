#!/bin/bash

CHANNEL_NAME=education-channel
CHAINCODE_NAME=certificate
CHAINCODE_PATH=../chaincode/certificate
CHAINCODE_LANG=node
CHAINCODE_LABEL=certificate_1
VERSION=1

peer lifecycle chaincode package ${CHAINCODE_NAME}.tar.gz \
  --path ${CHAINCODE_PATH} --lang ${CHAINCODE_LANG} --label ${CHAINCODE_LABEL}

peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

peer lifecycle chaincode queryinstalled

# Note: You'll need to approve and commit from each org with their respective env vars set.
# For test purposes, approve from one org (e.g. UniversityMSP):

peer lifecycle chaincode approveformyorg \
  --channelID ${CHANNEL_NAME} \
  --name ${CHAINCODE_NAME} \
  --version ${VERSION} \
  --package-id certificate_1:<PACKAGE_ID> \
  --sequence 1 \
  --init-required

peer lifecycle chaincode commit \
  -o localhost:7050 \
  --channelID ${CHANNEL_NAME} \
  --name ${CHAINCODE_NAME} \
  --version ${VERSION} \
  --sequence 1 \
  --init-required \
  --peerAddresses localhost:7051 \
  --tls --cafile <ORDERER_TLS_CA>

# Optional: Invoke init
peer chaincode invoke -o localhost:7050 \
  --isInit -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} \
  --peerAddresses localhost:7051 \
  -c '{"Args":[]}'
