import { redirect } from "next/navigation";

const publicAccessUrl = "https://bright-orbit-nexus.lovable.app";

export default function HomePage() {
  redirect(publicAccessUrl);
}
