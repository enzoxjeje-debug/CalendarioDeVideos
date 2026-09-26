import Landing from "@/components/Landing";
import { todayKey } from "@/lib/dates";
import { getState, storageKind } from "@/lib/store";

// El estado es compartido y cambia con cada visita: nunca se cachea estatico.
export const dynamic = "force-dynamic";

export default async function Home() {
  const state = await getState();
  return (
    <Landing initialState={state} initialStorage={storageKind()} serverToday={todayKey()} />
  );
}
