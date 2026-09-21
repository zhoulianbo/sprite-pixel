'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            fontFamily:
              'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 500, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, margin: 0 }}>
            {error.digest ? `Error ID: ${error.digest}` : 'Please try again.'}
          </p>
          <button type="button" onClick={() => reset()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
