import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type LegacyDashboardPageProps = {
  searchParams: SearchParams;
};

function readSingleParam(value: string | string[] | undefined) {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function LegacyDashboardPage({
  searchParams
}: LegacyDashboardPageProps) {
  const params = await searchParams;
  const days = readSingleParam(params.days);

  if (days) {
    redirect(`/painel-executivo?days=${encodeURIComponent(days)}`);
  }

  redirect("/painel-executivo");
}

