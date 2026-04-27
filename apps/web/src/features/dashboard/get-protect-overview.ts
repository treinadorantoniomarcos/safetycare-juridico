export type ProtectOverview = {
  disabled: true;
  generatedAt: string;
  message: string;
};

export async function getProtectOverview(): Promise<ProtectOverview> {
  return {
    disabled: true,
    generatedAt: new Date().toISOString(),
    message: "Modulo Protect removido da plataforma."
  };
}
