'use strict';

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function main() {
  try {
    // Load connection profile for University org
    const ccpPath = path.resolve(university, 'network', 'connection-university.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Setup wallet to hold credentials of users
    const walletPath = path.join(university, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check identity exists
    const identity = await wallet.get('universityUser');
    if (!identity) {
      console.log('An identity for the user "universityUser" does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return;
    }

    // Connect gateway
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'universityUser',
      discovery: { enabled: true, asLocalhost: true },
    });

    // Get network channel and contract
    const network = await gateway.getNetwork('education-channel');
    const contract = network.getContract('certificate');

    // Issue Certificate
    console.log('\n--> Submit Transaction: IssueCertificate');
    await contract.submitTransaction('IssueCertificate', 'CERT1001', 'STUDENT1001', 'UniversityMSP', 'Computer Science', '2025-06-01');
    console.log('Certificate CERT1001 issued');

    // Query Certificate
    console.log('\n--> Evaluate Transaction: GetCertificate');
    const result = await contract.evaluateTransaction('GetCertificate', 'CERT1001');
    console.log(`Certificate Details: ${result.toString()}`);

    // Verify Certificate
    console.log('\n--> Evaluate Transaction: VerifyCertificate');
    const verify = await contract.evaluateTransaction('VerifyCertificate', 'CERT1001');
    console.log(`Certificate Valid: ${verify.toString()}`);

    // Unauthorized revoke attempt (simulate with Student identity)
    console.log('\n--> Attempt unauthorized RevokeCertificate (expect error)');
    try {
      // For demo, connect as studentUser (assumes studentUser in wallet)
      await gateway.disconnect();

      const ccpStudentPath = path.resolve(__dirname, 'network', 'connection-student.json');
      const ccpStudent = JSON.parse(fs.readFileSync(ccpStudentPath, 'utf8'));
      const gatewayStudent = new Gateway();

      await gatewayStudent.connect(ccpStudent, {
        wallet,
        identity: 'studentUser',
        discovery: { enabled: true, asLocalhost: true },
      });

      const networkStudent = await gatewayStudent.getNetwork('education-channel');
      const contractStudent = networkStudent.getContract('certificate');

      await contractStudent.submitTransaction('RevokeCertificate', 'CERT1001');
      console.log('Revoke succeeded (unexpected)');

      await gatewayStudent.disconnect();
    } catch (err) {
      console.error(`Expected error: ${err.message}`);
    }

    // Proper revoke by university
    await gateway.connect(ccp, {
      wallet,
      identity: 'universityUser',
      discovery: { enabled: true, asLocalhost: true },
    });

    console.log('\n--> Submit Transaction: RevokeCertificate by university');
    const revokeResult = await contract.submitTransaction('RevokeCertificate', 'CERT1001');
    console.log(revokeResult.toString());

    // Verify again after revoke
    const verifyAfterRevoke = await contract.evaluateTransaction('VerifyCertificate', 'CERT1001');
    console.log(`Certificate Valid After Revoke: ${verifyAfterRevoke.toString()}`);

    await gateway.disconnect();

  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

main();
