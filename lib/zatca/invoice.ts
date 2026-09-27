// @ts-nocheck
import { createHash, randomUUID } from "node:crypto";

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
