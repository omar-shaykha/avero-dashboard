// @ts-nocheck
import { DOMParser } from "@xmldom/xmldom";
import { C14nCanonicalization } from "xml-crypto";

export function canonicalizeZatcaXml(xml:string){
  const doc=new DOMParser().parseFromString(String(xml),"application/xml");
  const root=doc.documentElement;
  const parserErrors=doc.getElementsByTagName("parsererror");
  if(!root || parserErrors.length>0) throw new Error("Invalid XML for ZATCA canonicalization");
  return new C14nCanonicalization().process(root);
}
