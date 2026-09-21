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
export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("Portal storage is not configured");
  const client=holder.aloSql ??= postgres(process.env.DATABASE_URL, {
    prepare: false, max: 3, connect_timeout: 8, idle_timeout: 15,
    max_lifetime: 300, connection: { application_name: "shikho-alo" },
  });
  return new Proxy(client,{
    // Only a tagged template is a query worth timing out. The helper call
    // sql(rows,...columns) returns a fragment builder that the surrounding
    // template must receive untouched: postgres.js expands it by checking
    // `instanceof Builder`, and a promise wrapper fails that check, so the
    // fragment is serialised as a bind parameter and the INSERT is a syntax
    // error. That is why every batched analytics write returned 503.
    apply(target,thisArg,args){
      const tagged=Array.isArray(args[0])&&Object.prototype.hasOwnProperty.call(args[0],"raw");
      const result=Reflect.apply(target,thisArg,args);
      return tagged?deadline(result,client):result;
    },
    get(target,prop){
      if(prop==="begin")return (...args:unknown[])=>deadline(Reflect.apply(target.begin,target,args),client);
      const value=Reflect.get(target,prop);return typeof value==="function"?value.bind(target):value;
    },
  }) as Client;
}
