"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      router.push("/");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Giriş başarısız";
      if (errorMessage.includes("user-not-found")) {
        setError("Bu e-posta ile kayıtlı kullanıcı bulunamadı");
      } else if (errorMessage.includes("wrong-password")) {
        setError("Şifre hatalı");
      } else if (errorMessage.includes("invalid-email")) {
        setError("Geçersiz e-posta adresi");
      } else if (errorMessage.includes("invalid-credential")) {
        setError("E-posta veya şifre hatalı");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Life Timer</h1>
          <p className="text-gray-500 mt-2">Hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Hesabınız yok mu?{" "}
          <Link href="/register" className="text-blue-500 hover:text-blue-600 font-medium">
            Kayıt Ol
          </Link>
        </p>
      </div>
    </div>
  );
}
