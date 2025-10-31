# Guia de Deploy no Vercel

## Método 1: Deploy via Interface Web (Recomendado)

### Passo 1: Preparar o Repositório
1. Crie um repositório no GitHub
2. Faça upload de todos os arquivos do projeto
3. Certifique-se de que o `.gitignore` está configurado

```bash
git init
git add .
git commit -m "Initial commit: Carbon Cycle Simulator"
git branch -M main
git remote add origin <SEU_REPOSITORIO_GITHUB>
git push -u origin main
```

### Passo 2: Conectar ao Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Faça login com sua conta GitHub
3. Clique em "Add New Project"
4. Selecione o repositório `carbon-cycle-simulator`
5. O Vercel detectará automaticamente que é um projeto Next.js

### Passo 3: Configurar o Projeto
- **Framework Preset**: Next.js (detectado automaticamente)
- **Root Directory**: `./` (padrão)
- **Build Command**: `npm run build` (padrão)
- **Output Directory**: `.next` (padrão)
- **Install Command**: `npm install` (padrão)

### Passo 4: Variáveis de Ambiente
Não são necessárias variáveis de ambiente especiais para este projeto.

### Passo 5: Deploy
1. Clique em "Deploy"
2. Aguarde o build (2-3 minutos)
3. Seu site estará disponível em `https://<nome-do-projeto>.vercel.app`

## Método 2: Deploy via CLI

### Instalação da CLI
```bash
npm install -g vercel
```

### Deploy
```bash
# No diretório do projeto
vercel

# Ou para produção direta
vercel --prod
```

### Primeira vez
1. Faça login: `vercel login`
2. Responda às perguntas:
   - Set up and deploy? Y
   - Which scope? (selecione sua conta)
   - Link to existing project? N
   - Project name: carbon-cycle-simulator
   - In which directory is your code located? ./
   - Auto-detect project settings? Y

## Configurações Avançadas (Opcional)

### vercel.json
Crie um arquivo `vercel.json` na raiz se precisar de configurações específicas:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["gru1"]
}
```

### Domínio Personalizado
1. Acesse o dashboard do projeto no Vercel
2. Vá em "Settings" → "Domains"
3. Adicione seu domínio personalizado
4. Configure os registros DNS conforme instruído

## Performance e Otimizações

### Configurações Recomendadas
O projeto já está otimizado com:
- Code splitting automático do Next.js
- Lazy loading do Plotly.js
- Build otimizado para produção

### Monitoramento
- Analytics: Habilitado automaticamente no Vercel
- Logs: Disponíveis no dashboard
- Performance: Web Vitals no Vercel Analytics

## Troubleshooting

### Build Failed
1. Verifique os logs no Vercel dashboard
2. Teste localmente: `npm run build`
3. Certifique-se de que todas as dependências estão em `package.json`

### Plotly não carrega
- O import dinâmico já está configurado: `dynamic(() => import('react-plotly.js'), { ssr: false })`
- Verifique se `plotly.js` está em dependencies

### Erro de memória durante build
- Vercel tem limite de memória
- O projeto atual está dentro dos limites
- Se necessário, otimize imports do Plotly

## URLs Úteis

- Dashboard: https://vercel.com/dashboard
- Documentação: https://vercel.com/docs
- Next.js no Vercel: https://vercel.com/docs/frameworks/nextjs

## Atualizações Automáticas

Após o primeiro deploy:
- Cada push para `main` → deploy automático em produção
- Cada push para outras branches → preview deployment
- Pull Requests → preview deployment automático

## Custos

- **Hobby Plan** (Grátis):
  - Unlimited deployments
  - 100 GB bandwidth/mês
  - Serverless Functions
  - Perfeito para este projeto

- **Pro Plan** ($20/mês):
  - Apenas se precisar de mais recursos/analytics

## Checklist de Deploy

- [ ] Código testado localmente (`npm run dev`)
- [ ] Build funciona localmente (`npm run build`)
- [ ] `.gitignore` configurado
- [ ] `package.json` completo
- [ ] Repositório GitHub criado
- [ ] Projeto conectado ao Vercel
- [ ] Deploy realizado com sucesso
- [ ] Site acessível e funcional
- [ ] Simulação rodando corretamente

## Suporte

Se encontrar problemas:
1. Verifique os logs no dashboard do Vercel
2. Teste localmente com os mesmos comandos
3. Consulte a documentação do Vercel
4. Contate o suporte do Vercel (resposta rápida no plan gratuito)

---

**Pronto!** Seu simulador estará online e acessível globalmente através da CDN do Vercel.
