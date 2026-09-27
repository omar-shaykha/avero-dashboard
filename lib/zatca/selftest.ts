// @ts-nocheck
import { generateKeyPairSync, createVerify } from "node:crypto";
import { canonicalizeZatcaXml } from "./canonicalize";
import {
 buildZatcaUblInvoice, zatcaPrepareHashInput, buildZatcaSignedProperties,
 zatcaDigestSignedProperties, buildZatcaSignedInfo, zatcaSignCanonicalSignedInfoP1363,
 ZATCA_FIRST_PIH, zatcaUuid
} from "./invoice";

export function runZatcaCryptoSelfTest(){
 const {privateKey,publicKey}=generateKeyPairSync("ec",{namedCurve:"secp256k1"});
 const privateKeyPem=privateKey.export({type:"pkcs8",format:"pem"}).toString();
 const publicKeyPem=publicKey.export({type:"spki",format:"pem"}).toString();
 const now=new Date("2026-01-01T12:00:00Z");
 const xml=buildZatcaUblInvoice({
  invoiceKind:"simplified",invoiceNumber:"TEST-1",uuid:zatcaUuid(),
  issueDate:"2026-01-01",issueTime:"12:00:00Z",counter:1,previousHash:ZATCA_FIRST_PIH,
  seller:{name:"AVERO TEST",vatNumber:"300000000000003"},
  totals:{net:100,tax:15,total:115},
  lines:[{name:"Test Item",quantity:1,unitPrice:100,net:100,tax:15,total:115,taxRate:15}]
 });
 const invoice=zatcaPrepareHashInput(xml,canonicalizeZatcaXml);
 const props=buildZatcaSignedProperties({signatureId:"signature",certificateDigest:"TEST",issuerName:"TEST",serialNumber:"1",signingTime:now.toISOString()});
 const propsDigest=zatcaDigestSignedProperties(props,canonicalizeZatcaXml);
 const signedInfo=buildZatcaSignedInfo({invoiceDigest:invoice.hashBase64,signedPropertiesDigest:propsDigest.digestBase64});
 const canonicalSignedInfo=canonicalizeZatcaXml(signedInfo);
 const signature=zatcaSignCanonicalSignedInfoP1363(Buffer.from(canonicalSignedInfo,"utf8"),privateKeyPem);
 const verify=createVerify("SHA256"); verify.update(Buffer.from(canonicalSignedInfo,"utf8")); verify.end();
 const valid=verify.verify({key:publicKeyPem,dsaEncoding:"ieee-p1363"},signature);
 if(!valid) throw new Error("ZATCA cryptographic self-test failed");
 return {valid,invoiceHash:invoice.hashBase64,signedPropertiesDigest:propsDigest.digestBase64};
}
