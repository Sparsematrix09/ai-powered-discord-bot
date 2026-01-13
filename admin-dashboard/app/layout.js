export const metadata = {
  title: 'Discord Copilot Admin',
  description: 'Admin dashboard for Discord Copilot',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}