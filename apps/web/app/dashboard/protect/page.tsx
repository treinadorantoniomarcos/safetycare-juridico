import { redirect } from "next/navigation";

export default function ProtectPage() {
  redirect("/painel-executivo");
}
