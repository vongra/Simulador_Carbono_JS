export const metadata = {
  title: 'Simulador do Ciclo do Carbono',
  description: 'Simulação interativa do ciclo biogeoquímico do carbono',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
