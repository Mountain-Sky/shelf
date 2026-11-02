import "./globals.css";
import "./interface.css";
export const metadata = {
  title: "Shelf | Library discovery",
  description: "Local-first AI-native catalog prototype",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
