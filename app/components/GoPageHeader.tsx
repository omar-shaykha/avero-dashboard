"use client";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
export default function GoPageHeader(){const{language}=useLanguage(),ar=language==="ar";return <><Link href="/workspace" className="text-sm text-cyan-300">← AVERO OS</Link><h1 className="mt-4 text-3xl font-black">{ar?"AVERO GO · طلبات الاستلام":"AVERO GO · Pickup orders"}</h1><p className="mt-2 text-slate-400">{ar?"المنيو الإلكتروني، فرع الاستلام، والطلبات الجديدة في مكان واحد.":"Online menu, pickup branch, website design and incoming orders in one place."}</p></>}