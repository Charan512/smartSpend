"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthPanel from "../../components/AuthPanel";
import { ArrowLeft, Wallet } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem("userId")) {
      router.replace("/dashboard");
    }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar with back button */}
      <nav className="bg-white shadow-sm border-b px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft size={18} /> Back to Home
        </Link>
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
             <Wallet size={18} strokeWidth={2.5} />
          </div>
          <span className="font-extrabold tracking-tight text-gray-900">Smart Spend</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="w-full max-w-md">
          <AuthPanel onAuth={() => router.push("/dashboard")} />
        </div>
      </main>
    </div>
  );
}
