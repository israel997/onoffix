const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function GoogleButton() {
  return (
    <a
      href={`${API_URL}/auth/google`}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4">
        <path fill="#4285F4" d="M23.49 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.54-5.17 3.54-8.81z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.93H1.3v3.09C3.26 21.3 7.31 24 12 24z" />
        <path fill="#FBBC05" d="M5.31 14.31A7.2 7.2 0 0 1 4.93 12c0-.8.14-1.58.38-2.31V6.6H1.3A11.97 11.97 0 0 0 0 12c0 1.93.46 3.76 1.3 5.4z" />
        <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.6l4.01 3.09C6.25 6.85 8.89 4.75 12 4.75z" />
      </svg>
      Continue with Google
    </a>
  );
}
