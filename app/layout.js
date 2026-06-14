import './globals.css';

export const metadata = {
  title: 'The Table — eFootball League',
  description: 'Group ELO leaderboard for eFootball matches',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-pitch text-chalk min-h-screen font-sans">{children}</body>
    </html>
  );
}
