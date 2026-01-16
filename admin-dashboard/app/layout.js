export const metadata = {
  title: 'Discord Copilot Admin',
  description: 'Admin dashboard for Discord Copilot',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Load Tailwind CSS v4 via CDN */}
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        
        {/* Custom CSS for Tailwind v4 - define your color palette */}
        <style>{`
          :root {
            /* Gray scale */
            --color-gray-50: #f9fafb;
            --color-gray-100: #f3f4f6;
            --color-gray-200: #e5e7eb;
            --color-gray-300: #d1d5db;
            --color-gray-400: #9ca3af;
            --color-gray-500: #6b7280;
            --color-gray-600: #4b5563;
            --color-gray-700: #374151;
            --color-gray-800: #1f2937;
            --color-gray-900: #111827;
            --color-gray-950: #030712;
            
            /* Brand colors */
            --color-indigo-500: #5865F2;
            --color-indigo-600: #4752c4;
            --color-indigo-700: #3c46a5;
            --color-purple-500: #9146FF;
            --color-purple-600: #7c3aed;
            
            /* Status colors */
            --color-emerald-400: #34d399;
            --color-emerald-500: #10b981;
            --color-red-400: #f87171;
            --color-red-500: #ef4444;
            --color-blue-400: #60a5fa;
            --color-blue-500: #3b82f6;
            --color-yellow-400: #fbbf24;
            --color-yellow-500: #f59e0b;
          }
          
          /* Apply dark theme by default */
          body {
            background-color: var(--color-gray-950);
            color: var(--color-gray-100);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          }
          
          /* Custom scrollbar */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: var(--color-gray-900);
          }
          
          ::-webkit-scrollbar-thumb {
            background: var(--color-gray-700);
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: var(--color-gray-600);
          }
        `}</style>
      </head>
      <body className="min-h-screen bg-gray-950 text-gray-100">
        {children}
      </body>
    </html>
  )
}