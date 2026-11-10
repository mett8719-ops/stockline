export default function AuthPageLayout({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-sm">
        {children}
        <footer className="mt-4 text-center text-xs text-gray-400">
          Stockline v2.4 · © 2024 Stockline Africa
        </footer>
      </div>
    </main>
  );
}
