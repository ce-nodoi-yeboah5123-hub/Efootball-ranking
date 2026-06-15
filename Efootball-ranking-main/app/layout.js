import './globals.css';

export const metadata = {
  title: 'The Super League',
  description: 'Where legends are made.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
