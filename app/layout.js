import './globals.css';

export const metadata = {
  title: 'GBP Manager — Gestão Automatizada do Google Meu Negócio',
  description: 'Plataforma inteligente para gerenciar o Google Business Profile de múltiplos clientes com automação e IA.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
