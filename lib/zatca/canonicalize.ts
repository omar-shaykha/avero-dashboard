// @ts-nocheck
import { DOMParser } from "@xmldom/xmldom";
import { C14nCanonicalization } from "xml-crypto";

export function canonicalizeZatcaXml(xml:string){
  const doc=new DOMParser().parseFromString(String(xml),"application/xml");
  const root=doc.documentElement;
  if(!root) throw new Error("Invalid XML for ZATCA canonicalization");
  // xml-crypto's canonicalizer is used instead of whitespace/string normalization.
  // ZATCA invoice transforms are applied before this stage.
  return new C14nCanonicalization().process(root);
}
