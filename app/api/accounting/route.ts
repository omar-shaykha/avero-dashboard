// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthorizationContext,isKingAdmin,isTenantAdmin,hasPermission } from '@/lib/auth/authorization';
const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}});
const can=(a:any)=>isKingAdmin(a)||isTenantAdmin(a)||hasPermission(a,'sales.cost.view')||hasPermission(a,'inventory.cost.view');
export async function GET(){
 const a=await getAuthorizationContext();if(!a?.profile?.company_id)return NextResponse.json({error:'Unauthorized'},{status:401});if(!can(a))return NextResponse.json({error:'Forbidden'},{status:403});
 const s=db(),c=a.profile.company_id;
 const [accounts,journals,lines]=await Promise.all([
  s.from('accounting_accounts').select('*').eq('company_id',c).eq('active',true).order('code'),
  s.from('accounting_journal_entries').select('*').eq('company_id',c).order('entry_date',{ascending:false}).limit(100),
  s.from('accounting_journal_lines').select('journal_entry_id,account_id,debit,credit,description,accounting_accounts(code,name_en,name_ar,account_type)').eq('company_id',c).order('created_at',{ascending:false}).limit(1000)
 ]);
 const balances:any={};for(const l of lines.data||[]){const code=l.accounting_accounts?.code||l.account_id;balances[code]=(balances[code]||0)+Number(l.debit||0)-Number(l.credit||0)}
 const byJournal=new Map();for(const l of lines.data||[]){const arr=byJournal.get(l.journal_entry_id)||[];arr.push(l);byJournal.set(l.journal_entry_id,arr)}
 return NextResponse.json({accounts:accounts.data||[],balances,journals:(journals.data||[]).map((j:any)=>({...j,lines:byJournal.get(j.id)||[]}))});
}
