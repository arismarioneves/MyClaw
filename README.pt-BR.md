<p align="center">
<pre>
███╗   ███╗██╗   ██╗     ██████╗██╗      █████╗ ██╗    ██╗
████╗ ████║╚██╗ ██╔╝    ██╔════╝██║     ██╔══██╗██║    ██║
██╔████╔██║ ╚████╔╝     ██║     ██║     ███████║██║ █╗ ██║
██║╚██╔╝██║  ╚██╔╝      ██║     ██║     ██╔══██║██║███╗██║
██║ ╚═╝ ██║   ██║       ╚██████╗███████╗██║  ██║╚███╔███╔╝
╚═╝     ╚═╝   ╚═╝        ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝
</pre>
</p>

<p align="center">
  <b>Controle seu computador pelo Telegram usando Claude Code.</b><br>
  Simples. Leve. Sem complicação.
</p>

---

## O que é o MyClaw?

MyClaw é uma versão **lite e simplificada** do OpenClaw. Ele conecta o **Claude Code** ao **Telegram**, permitindo que você controle seu computador remotamente de qualquer lugar, direto pelo chat.

O projeto reutiliza o ambiente seguro do Claude Code (skills, sessões e coworking), mas com um bypass de permissões que dá acesso total ao sistema, não apenas a pasta do coworking.

### Como funciona?

```
Você (Telegram) → Bot MyClaw → Claude Code → Seu computador
```

1. Você envia uma mensagem no Telegram
2. O bot repassa para o Claude Code
3. O Claude executa a ação no seu computador
4. A resposta volta para o Telegram

---

## Requisitos

| Requisito | Detalhes |
|-----------|---------|
| **Node.js** | >= 20 |
| **Claude Code CLI** | Instalado e logado (`claude login`) |
| **Telegram** | Uma conta + bot criado pelo [@BotFather](https://t.me/BotFather) |

---

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/arismarioneves/MyClaw.git
cd MyClaw
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Execute o setup interativo

```bash
npm run setup
```

O setup vai:
- ✅ Verificar se o Node.js e o Claude CLI estão instalados
- ✅ Compilar o projeto (TypeScript → JavaScript)
- ✅ Pedir o **token do bot** do Telegram
- ✅ Abrir o arquivo `MYCLAW.md` para você personalizar o assistente
- ✅ Criar o arquivo `.env` com suas configurações
- ✅ Oferecer instalação como serviço em background (opcional)

### 4. Inicie o bot

```bash
npm run start
```

Pronto! Abra o Telegram e mande uma mensagem para o seu bot.

---

## Como conseguir o Token do Bot

1. Abra o Telegram e procure por **@BotFather**
2. Envie `/newbot`
3. Siga as instruções (escolha um nome e um username)
4. Copie o token que ele retorna (formato: `123456:ABCdef...`)

## Chat ID (automático)

O Chat ID é registrado **automaticamente**. Basta enviar `/start` para o seu bot no Telegram na primeira vez.

O bot detecta seu ID e salva no `.env`. Sem precisar copiar nada manualmente.

---

## Comandos disponíveis

### Telegram

| Comando | O que faz |
|---------|-----------|
| `/start` | Inicia o bot e registra seu Chat ID |
| `/chatid` | Mostra seu Chat ID |
| `/newchat` | Limpa a sessão e inicia uma nova conversa |
| `/forget` | Limpa a sessão atual |
| `/memory` | Mostra as memórias armazenadas |
| `/schedule list` | Lista tarefas agendadas |
| `/schedule pause <id>` | Pausa uma tarefa |
| `/schedule resume <id>` | Retoma uma tarefa pausada |
| `/schedule delete <id>` | Deleta uma tarefa |

### Terminal

| Comando | O que faz |
|---------|-----------|
| `npm run start` | Inicia o bot (produção) |
| `npm run dev` | Inicia em modo dev (hot reload) |
| `npm run setup` | Executa o assistente de configuração |
| `npm run status` | Verifica a saúde da configuração |
| `npm run build` | Compila o TypeScript |
| `npm run test` | Roda os testes |

---

## Agendamento de tarefas

Você pode agendar o bot para executar prompts automaticamente:

```bash
node dist/schedule-cli.js create "Resuma meus emails" "0 9 * * *" SEU_CHAT_ID
```

Exemplos de cron:

| Padrão | Frequência |
|--------|-----------|
| `0 9 * * *` | Todo dia às 9h |
| `0 9 * * 1` | Toda segunda às 9h |
| `0 */4 * * *` | A cada 4 horas |

---

## Personalização

Edite o arquivo **`MYCLAW.md`** na raiz do projeto para customizar:

- Nome do assistente
- Personalidade e tom de voz
- Skills disponíveis
- Regras de formatação

Você pode editar esse arquivo a qualquer momento. As mudanças são aplicadas na próxima mensagem.

---

## Envio de mídia

O bot aceita:

- 📷 **Fotos** — Envia uma imagem no Telegram e o Claude vai analisá-la
- 📄 **Documentos** — Envie arquivos para o Claude processar

---

## Sistemas operacionais compatíveis

| SO | Suporte | Serviço em background |
|----|---------|----------------------|
| **Windows** | ✅ | Via PM2 (`pm2 start dist/index.js --name myclaw`) |
| **macOS** | ✅ | Via launchd (configurado automaticamente pelo setup) |
| **Linux** | ✅ | Via systemd (configurado automaticamente pelo setup) |

---

## Estrutura do projeto

```
MyClaw/
├── src/
│   ├── index.ts        # Ponto de entrada
│   ├── bot.ts          # Lógica do bot Telegram (grammY)
│   ├── agent.ts        # Integração com Claude Code
│   ├── config.ts       # Configurações
│   ├── db.ts           # Banco de dados SQLite (sessões, memórias, tarefas)
│   ├── memory.ts       # Sistema de memória com decay
│   ├── scheduler.ts    # Agendador de tarefas (cron)
│   ├── media.ts        # Download e processamento de mídia
│   ├── format.ts       # Formatação de mensagens para Telegram
│   └── logger.ts       # Logger (pino)
├── scripts/
│   ├── setup.ts        # Assistente de instalação interativo
│   ├── status.ts       # Verificador de saúde
│   └── notify.sh       # Script de notificação
├── MYCLAW.md           # Personalidade do assistente
├── .env.example        # Exemplo de variáveis de ambiente
├── package.json
└── tsconfig.json
```

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Token do bot (via @BotFather) |
| `ALLOWED_CHAT_ID` | ❌ | Seu Chat ID (preenchido automaticamente no primeiro `/start`) |
| `ANTHROPIC_API_KEY` | ❌ | Chave da API Anthropic (opcional, usa `claude login` por padrão) |
| `LOG_LEVEL` | ❌ | Nível de log: `trace`, `debug`, `info`, `warn`, `error` (padrão: `info`) |

---

## Resumo rápido

```bash
git clone https://github.com/arismarioneves/MyClaw.git
cd MyClaw
npm install
npm run setup
npm run start
```

5 comandos. É isso.

---

<p align="center">
  <sub>Faça seu dia melhor com MyClaw</sub>
</p>
