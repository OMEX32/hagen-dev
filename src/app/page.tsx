import { redirect } from "next/navigation";
import { publicConfig } from "@/lib/env";
export default function Home() { redirect(publicConfig() ? "/today" : "/setup"); }
