import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-4 text-center dark:bg-neutral-950">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        OnOffix
      </h1>
      <p className="max-w-md text-sm text-neutral-600 dark:text-neutral-400">
        Sachez exactement comment vos collaborateurs évoluent sur leurs tâches.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Se connecter
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
        >
          Créer une organisation
        </Link>
      </div>
    </main>
  );
}
