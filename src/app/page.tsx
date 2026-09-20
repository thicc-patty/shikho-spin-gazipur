import { notFound } from "next/navigation";
import { getEvent } from "@/lib/events";
import { Journey } from "@/components/journey";
export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const params = await searchParams;
  const event = await getEvent(params.event);
  if (!event) notFound();
  return <Journey event={event} turnstileSiteKey={process.env.TURNSTILE_SITE_KEY||""}/>;
}
