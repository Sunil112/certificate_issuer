'use strict';

const { Contract } = require('fabric-contract-api');

class CertificateContract extends Contract {

  async IssueCertificate(ctx, certId, studentId, universityId, courseName, dateIssued) {
    const clientMSPID = ctx.clientIdentity.getMSPID();
    if (clientMSPID !== 'UniversityMSP') {
      throw new Error('Only a university can issue certificates');
    }

    const certExists = await ctx.stub.getState(certId);
    if (certExists && certExists.length > 0) {
      throw new Error(`Certificate ${certId} already exists`);
    }

    const cert = {
      certId,
      studentId,
      universityId,
      courseName,
      dateIssued,
      revoked: false,
    };

    await ctx.stub.putState(certId, Buffer.from(JSON.stringify(cert)));
    return JSON.stringify(cert);
  }

  async GetCertificate(ctx, certId) {
    const certBytes = await ctx.stub.getState(certId);
    if (!certBytes || certBytes.length === 0) {
      throw new Error(`Certificate ${certId} does not exist`);
    }
    return certBytes.toString();
  }

  async VerifyCertificate(ctx, certId) {
    const certBytes = await ctx.stub.getState(certId);
    if (!certBytes || certBytes.length === 0) {
      throw new Error(`Certificate ${certId} not found`);
    }

    const cert = JSON.parse(certBytes.toString());
    return !cert.revoked;
  }

  async RevokeCertificate(ctx, certId) {
    const clientMSPID = ctx.clientIdentity.getMSPID();

    const certBytes = await ctx.stub.getState(certId);
    if (!certBytes || certBytes.length === 0) {
      throw new Error(`Certificate ${certId} not found`);
    }

    const cert = JSON.parse(certBytes.toString());
    if (clientMSPID !== cert.universityId) {
      throw new Error('Only issuing university can revoke this certificate');
    }

    cert.revoked = true;
    await ctx.stub.putState(certId, Buffer.from(JSON.stringify(cert)));
    return 'Certificate revoked';
  }

  async GetCertificatesByStudent(ctx, studentId) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const results = [];
    for await (const res of iterator) {
      const cert = JSON.parse(res.value.toString());
      if (cert.studentId === studentId) {
        results.push(cert);
      }
    }
    return JSON.stringify(results);
  }
}

module.exports = CertificateContract;
