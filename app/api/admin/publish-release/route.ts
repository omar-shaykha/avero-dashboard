import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
export async function POST(){
 const access=await getAuthorizationContext();
 if(!access)return Response.json({error:"Unauthorized"},{status:401});
 if(!isKingAdmin(access))return Response.json({error:"Forbidden"},{status:403});
 return Response.json({ok:true,mode:"approval_gate",message:"Release approved by King. Client rollout remains disabled until the deployment hook is connected."});
}