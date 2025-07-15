const CertificateContract = require('./lib/certificate');
const { ChaincodeStub, Shim } = require('fabric-shim');
const { Contract } = require('fabric-contract-api');
module.exports.Contract = CertificateContract;
