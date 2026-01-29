import { redirect } from "next/navigation";

export default function Home() {
  // 루트(/)로 접속하면 최신 앱(/app/)으로 보냄
  redirect("/app/");
}
