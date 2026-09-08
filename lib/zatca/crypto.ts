// @ts-nocheck
import { createSign, generateKeyPairSync } from 'node:crypto';

type CsrConfig = {
  commonName: string;
  branchName: string;
  legalName: string;
  vatNumber: string;
  serialNumber: string;
  model?: string | null;
  invoiceType: 'standard' | 'simplified' | 'both';
  registeredAddress: string;
  businessCategory: string;
  environment: 'sandbox' | 'simulation' | 'production';
};

function derLength(n:number){
  if(n < 128) return Buffer.from([n]);
  const out:number[] = [];
  while(n){ out.unshift(n & 255); n >>>= 8; }
  return Buffer.from([0x80 | out.length, ...out]);
}
function tlv(tag:number, value:Buffer){ return Buffer.concat([Buffer.from([tag]), derLength(value.length), value]); }
function seq(...parts:Buffer[]){ return tlv(0x30, Buffer.concat(parts)); }
function set(...parts:Buffer[]){ return tlv(0x31, Buffer.concat(parts)); }
function integerZero(){ return Buffer.from([0x02,0x01,0x00]); }
function utf8(value:string){ return tlv(0x0c, Buffer.from(value,'utf8')); }
function printable(value:string){ return tlv(0x13, Buffer.from(value,'ascii')); }
function octet(value:Buffer){ return tlv(0x04,value); }
function bitString(value:Buffer){ return tlv(0x03,Buffer.concat([Buffer.from([0]),value])); }
function context(tag:number,value:Buffer){ return tlv(0xa0 + tag,value); }

function oid(value:string){
  const parts = value.split('.').map(Number);
  const bytes:number[] = [40 * parts[0] + parts[1]];
  for(const raw of parts.slice(2)){
    let n = raw;
    const stack:number[] = [n & 0x7f];
    n >>>= 7;
    while(n){ stack.unshift(0x80 | (n & 0x7f)); n >>>= 7; }
    bytes.push(...stack);
  }
  return tlv(0x06,Buffer.from(bytes));
}
function atv(oidValue:string,value:string,kind:'utf8'|'printable'='utf8'){
  return seq(oid(oidValue),kind === 'printable' ? printable(value) : utf8(value));
}
function rdn(oidValue:string,value:string,kind:'utf8'|'printable'='utf8'){
  return set(atv(oidValue,value,kind));
}
function name(items:Array<{oid:string,value:string,kind?:'utf8'|'printable'}>){
  return seq(...items.map((x)=>rdn(x.oid,x.value,x.kind || 'utf8')));
}
function pem(label:string,der:Buffer){
  const body = der.toString('base64').match(/.{1,64}/g)?.join('\n') || '';
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`;
}

export function zatcaInvoiceTypeCode(type:CsrConfig['invoiceType']){
  if(type === 'standard') return '1000';
  if(type === 'simplified') return '0100';
  return '1100';
}

export function zatcaEgsSerial(serial:string,model?:string|null){
  return `1-AVERO OS|2-${String(model || '1.0').trim()}|3-${String(serial).trim()}`;
}

export function pemBody(value:string){
  return String(value || '').replace(/-----BEGIN [^-]+-----/g,'').replace(/-----END [^-]+-----/g,'').replace(/\s+/g,'');
}

export function generateZatcaSoftwareCsr(config:CsrConfig){
  const { privateKey, publicKey } = generateKeyPairSync('ec',{ namedCurve:'secp256k1' });
  const privateKeyPem = privateKey.export({ type:'pkcs8', format:'pem' }).toString();
  const publicKeyPem = publicKey.export({ type:'spki', format:'pem' }).toString();
  const publicKeyDer = publicKey.export({ type:'spki', format:'der' }) as Buffer;
  const invoiceTypeCode = zatcaInvoiceTypeCode(config.invoiceType);
  const formattedSerial = zatcaEgsSerial(config.serialNumber,config.model);

  const subject = name([
    {oid:'2.5.4.6', value:'SA', kind:'printable'},
    {oid:'2.5.4.11', value:config.branchName},
    {oid:'2.5.4.10', value:config.legalName},
    {oid:'2.5.4.3', value:config.commonName},
  ]);

  const altName = name([
    {oid:'2.5.4.5', value:formattedSerial},
    {oid:'0.9.2342.19200300.100.1.1', value:config.vatNumber},
    {oid:'2.5.4.12', value:invoiceTypeCode},
    {oid:'2.5.4.26', value:config.registeredAddress},
    {oid:'2.5.4.15', value:config.businessCategory},
  ]);

  const template = config.environment === 'production' ? 'ZATCA-Code-Signing' : 'PREZATCA-Code-Signing';
  const templateExt = seq(
    oid('1.3.6.1.4.1.311.20.2'),
    octet(printable(template)),
  );
  const subjectAltNameExt = seq(
    oid('2.5.29.17'),
    octet(seq(context(4,altName))),
  );
  const extensions = seq(templateExt,subjectAltNameExt);
  const extensionRequest = seq(
    oid('1.2.840.113549.1.9.14'),
    set(extensions),
  );

  const certificationRequestInfo = seq(
    integerZero(),
    subject,
    publicKeyDer,
    context(0,extensionRequest),
  );

  const signer = createSign('SHA256');
  signer.update(certificationRequestInfo);
  signer.end();
  const signature = signer.sign(privateKeyPem);
  const signatureAlgorithm = seq(oid('1.2.840.10045.4.3.2'));
  const csrDer = seq(certificationRequestInfo,signatureAlgorithm,bitString(signature));
  const csrPem = pem('CERTIFICATE REQUEST',csrDer);

  return {
    privateKeyPem,
    publicKeyPem,
    csrPem,
    csrBase64:csrDer.toString('base64'),
    invoiceTypeCode,
    formattedSerial,
    template,
  };
}
