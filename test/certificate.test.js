'use strict';

const sinon = require('sinon');
const chai = require('chai');
chai.should();

const CertificateContract = require('../chaincode/certificate/lib/certificate');

describe('CertificateContract', () => {
  let contract, ctx, stub;

  beforeEach(() => {
    contract = new CertificateContract();

    stub = {
      getState: sinon.stub(),
      putState: sinon.stub(),
      getStateByRange: sinon.stub()
    };

    ctx = {
      stub,
      clientIdentity: {
        getMSPID: sinon.stub()
      }
    };
  });

  it('should allow university to issue certificate', async () => {
    ctx.clientIdentity.getMSPID.returns('UniversityMSP');
    stub.getState.resolves(Buffer.from(''));  // no existing cert
    stub.putState.resolves();

    await contract.IssueCertificate(ctx, 'CERT1', 'STUDENT1', 'UniversityMSP', 'Blockchain 101', '2025-06-01');
    sinon.assert.calledOnce(stub.putState);
  });

  it('should not allow non-university to issue certificate', async () => {
    ctx.clientIdentity.getMSPID.returns('StudentMSP');
    stub.getState.resolves(Buffer.from(''));

    try {
      await contract.IssueCertificate(ctx, 'CERT2', 'STUDENT2', 'UniversityMSP', 'Blockchain 101', '2025-06-01');
    } catch (err) {
      err.message.should.equal('Only a university can issue certificates');
      return;
    }
    throw new Error('Expected error not thrown');
  });

  it('should get existing certificate', async () => {
    const cert = { certId: 'CERT1', studentId: 'STUDENT1', universityId: 'UniversityMSP', revoked: false };
    stub.getState.resolves(Buffer.from(JSON.stringify(cert)));

    const result = await contract.GetCertificate(ctx, 'CERT1');
    JSON.parse(result).certId.should.equal('CERT1');
  });

  it('should throw error for non-existing certificate', async () => {
    stub.getState.resolves(Buffer.from(''));
    try {
      await contract.GetCertificate(ctx, 'UNKNOWN');
    } catch (err) {
      err.message.should.equal('Certificate UNKNOWN does not exist');
      return;
    }
    throw new Error('Expected error not thrown');
  });

  it('should revoke certificate by issuing university', async () => {
    ctx.clientIdentity.getMSPID.returns('UniversityMSP');
    const cert = { certId: 'CERT1', universityId: 'UniversityMSP', revoked: false };
    stub.getState.resolves(Buffer.from(JSON.stringify(cert)));
    stub.putState.resolves();

    const result = await contract.RevokeCertificate(ctx, 'CERT1');
    result.should.equal('Certificate revoked');
    sinon.assert.calledOnce(stub.putState);
  });

  it('should reject revoke from non-issuing org', async () => {
    ctx.clientIdentity.getMSPID.returns('StudentMSP');
    const cert = { certId: 'CERT1', universityId: 'UniversityMSP', revoked: false };
    stub.getState.resolves(Buffer.from(JSON.stringify(cert)));

    try {
      await contract.RevokeCertificate(ctx, 'CERT1');
    } catch (err) {
      err.message.should.equal('Only issuing university can revoke this certificate');
      return;
    }
    throw new Error('Expected error not thrown');
  });

  it('should return all certificates for a student', async () => {
    const cert1 = { certId: 'CERT1', studentId: 'STUDENT1' };
    const cert2 = { certId: 'CERT2', studentId: 'STUDENT1' };
    const cert3 = { certId: 'CERT3', studentId: 'STUDENT2' };

    // Mock iterator with async generator
    const iterator = {
      async *[Symbol.asyncIterator]() {
        yield { value: Buffer.from(JSON.stringify(cert1)) };
        yield { value: Buffer.from(JSON.stringify(cert2)) };
        yield { value: Buffer.from(JSON.stringify(cert3)) };
      }
    };

    stub.getStateByRange.resolves(iterator);

    const results = await contract.GetCertificatesByStudent(ctx, 'STUDENT1');
    const parsed = JSON.parse(results);
    parsed.length.should.equal(2);
  });

  it('should verify certificate authenticity', async () => {
    const cert = { revoked: false };
    stub.getState.resolves(Buffer.from(JSON.stringify(cert)));

    const verified = await contract.VerifyCertificate(ctx, 'CERT1');
    verified.should.equal(true);
  });

  it('should return false for revoked certificate', async () => {
    const cert = { revoked: true };
    stub.getState.resolves(Buffer.from(JSON.stringify(cert)));

    const verified = await contract.VerifyCertificate(ctx, 'CERT1');
    verified.should.equal(false);
  });

});
