# 🎀 Álbum Digital Hello Kitty & Friends

Um aplicativo web progressivo (PWA) desenvolvido para gerenciar a coleção de figurinhas do álbum *Hello Kitty and Friends*. Focado na experiência mobile, o app permite marcar as figurinhas obtidas, visualizar o progresso e sincronizar os dados em nuvem para compartilhamento entre dispositivos (ex: casal).

## ✨ Funcionalidades Principais

* **Interface Mobile-First:** Botões grandes e layout otimizado para toque, ideal para uso rápido na rua ou na banca de jornal.
* **Sincronização em Nuvem (Firebase):**
    * Login anônimo automático.
    * Sincronização de dados em tempo real (ou manual) via Firestore.
    * Feedback visual de status (Salvando, Salvo, Erro).
* **Gestão de Coleção:**
    * Separação visual entre figurinhas **Especiais** (HK1-HK20) e **Normais** (1-196).
    * Barra de progresso percentual exata.
* **Ferramentas de Troca:**
    * Botão "Copiar Faltantes": Gera automaticamente uma lista formatada em texto para enviar no WhatsApp.

## 🛠️ Tecnologias Utilizadas

* **Frontend:** [React](https://react.dev/) + [Vite](https://vitejs.dev/)
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) (com a fonte *Varela Round* para estética Kawaii)
* **Ícones:** [Lucide React](https://lucide.dev/)
* **Backend & Hospedagem:** [Google Firebase](https://firebase.google.com/)
    * **Authentication:** Login Anônimo.
    * **Firestore Database:** Banco de dados NoSQL.
    * **Hosting:** Hospedagem estática gratuita.

## 🚀 Como Rodar Localmente

Siga estes passos para rodar o projeto no seu computador:

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/SEU-USUARIO/album-hello-kitty-tracker.git](https://github.com/SEU-USUARIO/album-hello-kitty-tracker.git)
    cd album-hello-kitty-tracker
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure o Firebase:**
    * Crie um arquivo chamado `firebase.js` dentro da pasta `src/`.
    * Cole suas credenciais do Firebase (API Key, Project ID, etc.) neste arquivo.
    * *Nota: O arquivo `firebase.js` geralmente é ignorado pelo git por segurança.*

4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
    O app estará disponível em `http://localhost:5173`.

## 📱 Como Testar no Celular (Rede Local)

Para testar no seu celular sem precisar fazer deploy, certifique-se que o celular e o PC estão no mesmo Wi-Fi e rode:

```bash
npm run dev -- --host