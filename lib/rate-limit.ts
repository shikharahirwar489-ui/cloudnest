import 'server-only';
const buckets = new Map<string,{count:number;reset:number}>();
// Process-local safeguard for development/single-instance use. TODO: use a shared limiter (for example Redis) across production instances.
export function rateLimit(key:string,limit:number,windowMs:number){const now=Date.now();let item=buckets.get(key);if(!item||item.reset<=now){item={count:0,reset:now+windowMs};buckets.set(key,item)}item.count++;if(buckets.size>5000)for(const [k,v] of buckets)if(v.reset<=now)buckets.delete(k);return item.count<=limit}
export function requestKey(req:Request){return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'}
