# Guia: ligar a pasta ao VS Code e ao GitHub

Este guia é para fazer **uma vez** e depois usar todo dia com 1 clique.

## Como vai funcionar

Você terá **dois repositórios** no GitHub, com objetivos diferentes:

| | Repositório privado | Repositório público (portfólio) |
|---|---|---|
| Nome sugerido | `diamante-app-privado` | `diamante-app` |
| Para quê | Backup completo do código | Mostrar seu trabalho |
| De onde vem | Esta pasta (`Diamante App`) | Gerado automaticamente em `Diamante App - Portfolio` |
| Banco de dados e senhas | Nunca | Nunca |

> O banco de dados (`data/*.sqlite`) e o `config.local.php` **nunca vão para o GitHub**, nem para o privado. O backup dos dados continua sendo feito pelo próprio app (Administração → Backup) e pelos scripts da pasta `Diamante App - Backup`.

```
Documentos\Claude Code - VS Code\dōTERRA\
├── Diamante App\                ← você trabalha aqui (repositório PRIVADO)
├── Diamante App - Portfolio\    ← gerada pelo script (repositório PÚBLICO)
└── Diamante App - Backup\       ← scripts de backup com token (NÃO vai para o Git)
```

---

## Passo 1: instalar o que falta (uma vez)

1. **Git para Windows:** https://git-scm.com/download/win (pode aceitar tudo no padrão).
2. **VS Code:** https://code.visualstudio.com (você já tem).
3. **PHP** (só se quiser testar o app no seu computador): https://windows.php.net/download, versão 8.3.
4. Uma **conta no GitHub** (https://github.com). Ative a verificação em duas etapas em *Settings → Password and authentication*.

Depois de instalar o Git, **feche e abra o VS Code**.

## Passo 2: abrir a pasta no VS Code

1. VS Code → **File → Open Folder...**
2. Escolha `C:\Users\user\Documents\Claude Code - VS Code\dōTERRA\Diamante App`.
3. Clique em **"Yes, I trust the authors"**.
4. Aceite a sugestão de instalar as extensões recomendadas (PHP, Prettier, GitLens, Markdown).

Pronto: a pasta do computador **é** o projeto do VS Code. Tudo o que você (ou eu) salvar nela já aparece no painel **Source Control** (ícone de ramificação, `Ctrl+Shift+G`).

## Passo 3: criar os dois repositórios vazios no GitHub

No github.com → **New repository** (duas vezes):

| Nome | Visibilidade | Marcar "Add README"? |
|---|---|---|
| `diamante-app-privado` | **Private** | ❌ Não |
| `diamante-app` | **Public** | ❌ Não |

Deixe **vazios** (sem README, sem .gitignore, sem licença). Copie o endereço de cada um (termina com `.git`).

## Passo 4: ligar tudo (uma vez)

No VS Code: **Terminal → New Terminal** e rode (troque `SEU-USUARIO`, o nome e o e-mail):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configurar-git.ps1 `
  -UrlPrivado "https://github.com/SEU-USUARIO/diamante-app-privado.git" `
  -UrlPublico "https://github.com/SEU-USUARIO/diamante-app.git" `
  -Nome "Seu Nome" -Email "seu@email.com"
```

O que acontece:

0. Ele instala as **tarefas do VS Code** (menu *Terminal → Run Task*) copiando `scripts\vscode` para `.vscode`.
1. Uma janela do navegador pede para você **entrar no GitHub** (autorize o Git Credential Manager).
2. O script envia a pasta atual ao repositório **privado**.
3. O script gera a **versão pública**, faz a **varredura de segurança** e só então envia ao repositório público.

Se a varredura achar qualquer segredo, **nada é enviado** e ela diz o arquivo e o motivo.

## Passo 5: o dia a dia

### Salvar no GitHub privado (backup)
- **Terminal → Run Task... → "1) Salvar no GitHub (privado)"**, ou
- No painel **Source Control**: escreva uma mensagem e clique em **Commit**. Com a configuração do projeto, o commit já faz o envio (push) sozinho.

### Atualizar o portfólio público
- **Terminal → Run Task... → "2) Atualizar o portfólio (público)"**.
- Quer só conferir antes? Use **"3) Só gerar e conferir o portfólio"**.

### Atalho de teclado (opcional)
`Ctrl+Shift+P` → "Tasks: Run Task". Para criar um atalho, vá em *File → Preferences → Keyboard Shortcuts*.

### E o "tempo real"?
O VS Code já **busca** as novidades do GitHub sozinho (`git.autofetch`). Já **enviar** a cada tecla salva não é recomendado: gera centenas de versões bagunçadas e aumenta o risco de subir algo por engano. O ideal é enviar **ao terminar uma tarefa** (1 clique). Se mesmo assim quiser envio automático, a extensão **GitDoc** faz isso; o `.gitignore` continua protegendo os segredos.

## Passo 6: conferir que nada sensível subiu

Depois do primeiro envio, abra os dois repositórios no github.com e confirme que **não existe**:

- `config.local.php`
- nenhum arquivo `.sqlite`
- a pasta `Diamante App - Backup`
- (no público) as pastas `assets/img/depoimentos` e `assets/img/oleos`

**Se algum segredo subir por engano:**
1. Troque imediatamente a `SETUP_KEY`, o `BACKUP_TOKEN` e (com cuidado) a `DADOS_KEY`. Atenção: trocar a `DADOS_KEY` impede ler as senhas do Clube já guardadas; peça ajuda antes.
2. Apagar o arquivo do repositório **não basta**, pois ele continua no histórico. Peça ajuda para limpar o histórico ou recrie o repositório.

## Passo 7: lembre que o GitHub não atualiza o site

O GitHub guarda o **código**. O site na Hostinger continua sendo atualizado como antes: enviando os arquivos novos para a `public_html` (sem mexer na pasta `data/` nem no `config.local.php` do servidor). Se um dia quiser automatizar, a Hostinger tem implantação por Git, e como `data/` e `config.local.php` ficam fora do repositório, o banco continuaria seguro.

## Problemas comuns

| Mensagem | O que fazer |
|---|---|
| `git não é reconhecido` | Instale o Git (Passo 1) e reabra o VS Code. |
| `a execução de scripts foi desabilitada` | Rode usando `powershell -ExecutionPolicy Bypass -File .\scripts\NOME.ps1`. |
| `Authentication failed` | Faça login de novo quando o navegador abrir. Contas com 2FA usam o login pelo navegador, não a senha. |
| `remote origin already exists` | Normal; o script já corrige sozinho. |
| `failed to push (rejected)` | O GitHub tem algo que a pasta não tem. Rode `git pull --rebase` e tente de novo. |
| Varredura acusou problema | Leia a lista, corrija o arquivo indicado e rode de novo. |
