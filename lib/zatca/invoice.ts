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
