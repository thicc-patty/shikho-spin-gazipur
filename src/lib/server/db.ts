import "server-only";
import postgres from "postgres";
type Client = ReturnType<typeof postgres>;
const holder = globalThis as unknown as { aloSql?: Client };
// Pooler connections can stall waiting for client protocol data. A stalled
// request must release the client and return a retryable error, never hang.
function deadline<T>(work: PromiseLike<T>, owner: Client): Promise<T> {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{
      if(holder.aloSql===owner)holder.aloSql=undefined;
      void owner.end({timeout:0}).catch(()=>{});
      reject(new Error("Database request timed out"));
    },12_000);
    Promise.resolve(work).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  });
}
function connect(): Client {
  if (!process.env.DATABASE_URL) throw new Error("Portal storage is not configured");
  return holder.aloSql ??= postgres(process.env.DATABASE_URL, {
    prepare: false, max: 3, connect_timeout: 8, idle_timeout: 15,
    max_lifetime: 300, connection: { application_name: "shikho-alo" },
  });
}
// Neon suspends its compute when nothing has queried it for a few minutes, so
// the first student of the morning pays for waking it and the connect can
// outlast connect_timeout. That surfaced as a page that simply did not load,
// which came right on a second try because the database was awake by then.
// Retried once, and only for a failure raised before the statement was sent:
// the query never reached the server, so running it again cannot repeat a
// write. Anything that failed after the server saw it is rethrown untouched.
const COLD=new Set(["CONNECT_TIMEOUT","ECONNREFUSED","ENOTFOUND","ETIMEDOUT","EAI_AGAIN"]);
/** True only for failures raised before the statement reached the server.
 *  CONNECTION_CLOSED, CONNECTION_DESTROYED and CONNECTION_ENDED are absent on
 *  purpose: they can be thrown after a write was sent, and a retry would run it
 *  twice. The 12s deadline error carries no code, so it never retries either. */
export const retryableConnect=(error:unknown)=>COLD.has((error as {code?:string})?.code??"");
async function wake<T>(run:(client:Client)=>PromiseLike<T>):Promise<T>{
  const client=connect();
  try{return await deadline(run(client),client);}
  catch(error){
    if(!retryableConnect(error))throw error;
    if(holder.aloSql===client){holder.aloSql=undefined;void client.end({timeout:0}).catch(()=>{});}
    const retry=connect();
    return deadline(run(retry),retry);
  }
}
export function sql() {
  const client=connect();
  return new Proxy(client,{
    // Only a tagged template is a query worth timing out. The helper call
    // sql(rows,...columns) returns a fragment builder that the surrounding
    // template must receive untouched: postgres.js expands it by checking
    // `instanceof Builder`, and a promise wrapper fails that check, so the
    // fragment is serialised as a bind parameter and the INSERT is a syntax
    // error. That is why every batched analytics write returned 503.
    apply(target,thisArg,args){
      const tagged=Array.isArray(args[0])&&Object.prototype.hasOwnProperty.call(args[0],"raw");
      if(!tagged)return Reflect.apply(target,thisArg,args);
      return wake(current=>Reflect.apply(current,thisArg,args));
    },
    get(target,prop){
      if(prop==="begin")return (...args:unknown[])=>wake(current=>Reflect.apply(current.begin,current,args));
      const value=Reflect.get(target,prop);return typeof value==="function"?value.bind(target):value;
    },
  }) as Client;
}
