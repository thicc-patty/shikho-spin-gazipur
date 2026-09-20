import { notFound } from "next/navigation";
import { getEvent } from "@/lib/events";
import { Journey } from "@/components/journey";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index:false, follow:false } };
export default async function Demo({searchParams}:{searchParams:Promise<{event?:string}>}) {
  const event=await getEvent((await searchParams).event);
  if(!event)notFound();
  return <Journey event={event} demo/>;
}
