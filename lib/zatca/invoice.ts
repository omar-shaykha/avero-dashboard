// @ts-nocheck
import { createHash, randomUUID, createSign, createPublicKey } from "node:crypto";

export const zatcaUuid=()=>randomUUID();
export const zatcaSha256Base64=(value:string|Buffer)=>createHash("sha256").update(value).digest("base64");

export function zatcaTlvBase64(fields:Array<{tag:number,value:string|Buffer}>){
 const chunks=fields.map(({tag,value})=>{
  const b=Buffer.isBuffer(value)?value:Buffer.from(String(value),"utf8");
  if(b.length>255) throw new Error("ZATCA QR TLV field exceeds 255 bytes");
  return Buffer.concat([Buffer.from([tag,b.length]),b]);
 });
 return Buffer.concat(chunks).toString("base64");
}

export function zatcaQrBaseFields(input:{sellerName:string;vatNumber:string;timestamp:string;total:number;vatTotal:number}){
 return zatcaTlvBase64([
  {tag:1,value:input.sellerName},{tag:2,value:input.vatNumber},{tag:3,value:input.timestamp},
  {tag:4,value:Number(input.total).toFixed(2)},{tag:5,value:Number(input.vatTotal).toFixed(2)}
 ]);
}

const xmlEsc=(v:any)=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const sar=(v:any)=>Number(v||0).toFixed(2);

export function buildZatcaUblInvoice(i:any){
 const simplified=i.invoiceKind==="simplified";
 const lines=(i.lines||[]).map((l:any,n:number)=>`<cac:InvoiceLine><cbc:ID>${n+1}</cbc:ID><cbc:InvoicedQuantity unitCode="${xmlEsc(l.unitCode||"PCE")}">${Number(l.quantity)}</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="SAR">${sar(l.net)}</cbc:LineExtensionAmount><cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${sar(l.tax)}</cbc:TaxAmount></cac:TaxTotal><cac:Item><cbc:Name>${xmlEsc(l.name)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${Number(l.taxRate||15)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="SAR">${sar(l.unitPrice)}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>`).join("");
 return `<?xml version="1.0" encoding="UTF-8"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"><cbc:ProfileID>reporting:1.0</cbc:ProfileID><cbc:ID>${xmlEsc(i.invoiceNumber)}</cbc:ID><cbc:UUID>${xmlEsc(i.uuid)}</cbc:UUID><cbc:IssueDate>${xmlEsc(i.issueDate)}</cbc:IssueDate><cbc:IssueTime>${xmlEsc(i.issueTime)}</cbc:IssueTime><cbc:InvoiceTypeCode name="${simplified?"0200000":"0100000"}">388</cbc:InvoiceTypeCode><cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode><cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode><cac:AdditionalDocumentReference><cbc:ID>ICV</cbc:ID><cbc:UUID>${Number(i.counter)}</cbc:UUID></cac:AdditionalDocumentReference><cac:AdditionalDocumentReference><cbc:ID>PIH</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${xmlEsc(i.previousHash)}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference><cac:AccountingSupplierParty><cac:Party><cac:PartyTaxScheme><cbc:CompanyID>${xmlEsc(i.seller.vatNumber)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme><cac:PartyLegalEntity><cbc:RegistrationName>${xmlEsc(i.seller.name)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>${simplified?"":`<cac:AccountingCustomerParty><cac:Party><cac:PartyTaxScheme><cbc:CompanyID>${xmlEsc(i.buyer?.vatNumber)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme><cac:PartyLegalEntity><cbc:RegistrationName>${xmlEsc(i.buyer?.name)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>`}<cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${sar(i.totals.tax)}</cbc:TaxAmount></cac:TaxTotal><cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="SAR">${sar(i.totals.net)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="SAR">${sar(i.totals.net)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="SAR">${sar(i.totals.total)}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="SAR">${sar(i.totals.total)}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lines}</Invoice>`;
}


export function zatcaQrPhase2(input:{sellerName:string;vatNumber:string;timestamp:string;total:number;vatTotal:number;invoiceHash:Buffer;signature:Buffer;publicKey:Buffer;caSignature?:Buffer|null}){
 const fields:Array<{tag:number,value:string|Buffer}>=[
  {tag:1,value:input.sellerName},{tag:2,value:input.vatNumber},{tag:3,value:input.timestamp},
  {tag:4,value:Number(input.total).toFixed(2)},{tag:5,value:Number(input.vatTotal).toFixed(2)},
  {tag:6,value:input.invoiceHash},{tag:7,value:input.signature},{tag:8,value:input.publicKey}
 ];
 if(input.caSignature?.length) fields.push({tag:9,value:input.caSignature});
 return zatcaTlvBase64(fields);
}


export function zatcaSignHashP1363(invoiceHash:Buffer,privateKeyPem:string){
 const signer=createSign("SHA256");
 signer.update(invoiceHash); signer.end();
 return signer.sign({key:privateKeyPem,dsaEncoding:"ieee-p1363"});
}
export function zatcaRawEcPublicKey(publicKeyPem:string){
 const jwk:any=createPublicKey(publicKeyPem).export({format:"jwk"});
 const dec=(v:string)=>Buffer.from(v.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(v.length/4)*4,"="),"base64");
 return Buffer.concat([dec(jwk.x),dec(jwk.y)]);
}


export const ZATCA_FIRST_PIH="NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

export function zatcaInvoiceHashFromCanonicalXml(canonicalXml:string){
 return createHash("sha256").update(Buffer.from(canonicalXml,"utf8")).digest();
}

export function zatcaInvoiceHashBase64FromCanonicalXml(canonicalXml:string){
 return zatcaInvoiceHashFromCanonicalXml(canonicalXml).toString("base64");
}


export function zatcaHashTransformSourceXml(xml:string){
 return String(xml)
  .replace(/<ext:UBLExtensions[\s\S]*?<\/ext:UBLExtensions>/g,"")
  .replace(/<cac:Signature[\s\S]*?<\/cac:Signature>/g,"")
  .replace(/<cac:AdditionalDocumentReference>\s*<cbc:ID>QR<\/cbc:ID>[\s\S]*?<\/cac:AdditionalDocumentReference>/g,"");
}


export const ZATCA_C14N11="http://www.w3.org/2006/12/xml-c14n11";
export const ZATCA_ECDSA_SHA256="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256";
export const ZATCA_SHA256="http://www.w3.org/2001/04/xmlenc#sha256";
export const ZATCA_SIGNED_PROPERTIES_TYPE="http://uri.etsi.org/01903#SignedProperties";

export function buildZatcaSignedProperties(i:{signatureId:string;certificateDigest:string;issuerName:string;serialNumber:string;signingTime:string}){
 return `<xades:SignedProperties Id="xadesSignedProperties" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"><xades:SignedSignatureProperties><xades:SigningTime>${xmlEsc(i.signingTime)}</xades:SigningTime><xades:SigningCertificate><xades:Cert><xades:CertDigest><ds:DigestMethod Algorithm="${ZATCA_SHA256}"/><ds:DigestValue>${xmlEsc(i.certificateDigest)}</ds:DigestValue></xades:CertDigest><xades:IssuerSerial><ds:X509IssuerName>${xmlEsc(i.issuerName)}</ds:X509IssuerName><ds:X509SerialNumber>${xmlEsc(i.serialNumber)}</ds:X509SerialNumber></xades:IssuerSerial></xades:Cert></xades:SigningCertificate></xades:SignedSignatureProperties></xades:SignedProperties>`;
}

export function buildZatcaSignedInfo(i:{invoiceDigest:string;signedPropertiesDigest:string}){
 return `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:CanonicalizationMethod Algorithm="${ZATCA_C14N11}"/><ds:SignatureMethod Algorithm="${ZATCA_ECDSA_SHA256}"/><ds:Reference Id="invoiceSignedData" URI=""><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath></ds:Transform><ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>not(//ancestor-or-self::cac:Signature)</ds:XPath></ds:Transform><ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>not(//ancestor-or-self::cac:AdditionalDocumentReference[cbc:ID='QR'])</ds:XPath></ds:Transform><ds:Transform Algorithm="${ZATCA_C14N11}"/></ds:Transforms><ds:DigestMethod Algorithm="${ZATCA_SHA256}"/><ds:DigestValue>${xmlEsc(i.invoiceDigest)}</ds:DigestValue></ds:Reference><ds:Reference Type="${ZATCA_SIGNED_PROPERTIES_TYPE}" URI="#xadesSignedProperties"><ds:DigestMethod Algorithm="${ZATCA_SHA256}"/><ds:DigestValue>${xmlEsc(i.signedPropertiesDigest)}</ds:DigestValue></ds:Reference></ds:SignedInfo>`;
}


export function buildZatcaXadesSignatureXml(i:{signedInfoCanonical:string;signatureValueBase64:string;certificateBase64:string;signedPropertiesXml:string}){
 return `<ext:UBLExtensions xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"><ext:UBLExtension><ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI><ext:ExtensionContent><sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2" xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2" xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2"><sac:SignatureInformation><cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID><sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID><ds:Signature Id="signature" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${i.signedInfoCanonical}<ds:SignatureValue>${xmlEsc(i.signatureValueBase64)}</ds:SignatureValue><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${xmlEsc(i.certificateBase64)}</ds:X509Certificate></ds:X509Data></ds:KeyInfo><ds:Object><xades:QualifyingProperties Target="signature" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">${i.signedPropertiesXml}</xades:QualifyingProperties></ds:Object></ds:Signature></sac:SignatureInformation></sig:UBLDocumentSignatures></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>`;
}

export function injectZatcaUblExtensions(xml:string,extensions:string){
 const marker="<Invoice ";
 const p=xml.indexOf(marker);
 if(p<0) throw new Error("Invalid UBL invoice root");
 const end=xml.indexOf(">",p);
 if(end<0) throw new Error("Invalid UBL invoice root");
 return xml.slice(0,end+1)+extensions+xml.slice(end+1);
}


export function zatcaPrepareHashInput(xml:string,canonicalize:(xml:string)=>string){
 const transformed=zatcaHashTransformSourceXml(xml).replace(/^\s*<\?xml[^>]*\?>\s*/i,"");
 const canonical=canonicalize(transformed);
 return {transformedXml:transformed,canonicalXml:canonical,hash:zatcaInvoiceHashFromCanonicalXml(canonical),hashBase64:zatcaInvoiceHashBase64FromCanonicalXml(canonical)};
}

export function zatcaDigestSignedProperties(signedPropertiesXml:string,canonicalize:(xml:string)=>string){
 const canonical=canonicalize(signedPropertiesXml);
 return {canonicalXml:canonical,digestBase64:zatcaSha256Base64(canonical)};
}
