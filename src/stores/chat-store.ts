import { acceptHMRUpdate, defineStore } from 'pinia';
import { api } from 'src/boot/axios';

const STORAGE_KEY = 'rag-chat-messages';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

const createMessage = (role: ChatRole, content: string): ChatMessage => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${role}-${Date.now()}-${Math.random()}`,
  role,
  content,
  createdAt: new Date().toISOString(),
});

const readMessages = (): ChatMessage[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistMessages = (messages: ChatMessage[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
};

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [] as ChatMessage[],
    loading: false,
  }),

  getters: {
    hasMessages: (state) => state.messages.length > 0,
  },

  actions: {
    initFromStorage() {
      if (this.messages.length > 0) {
        return;
      }

      this.messages = readMessages();
    },

    appendMessage(role: ChatRole, content: string) {
      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      this.messages.push(createMessage(role, trimmed));
      persistMessages(this.messages);
    },

    replaceMessages(messages: ChatMessage[]) {
      this.messages = messages;
      persistMessages(this.messages);
    },

    clearConversation() {
      this.messages = [];
      persistMessages(this.messages);
    },

    async askRag(prompt: string) {
      const query = prompt.trim();
      if (!query) {
        return;
      }

      this.appendMessage('user', query);
      this.loading = true;

      try {
        const { data: { data: responseData } } = await api.post('/rag/search', {
          question: query,
          top_k: 10,
        });

        console.log('data: ', responseData)
        const answer =
          typeof responseData === 'string' && responseData.trim().length > 0
            ? responseData.trim()
            : 'No answer returned by the service.';

        this.appendMessage('assistant', answer);
        return answer;
      } catch (error) {
        this.appendMessage('assistant', 'Unable to retrieve answer. Please try again.');
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChatStore, import.meta.hot));
}

