<template>
  <q-page class="chat-page">
    <div class="chat-shell">
      <div ref="messagesContainer" class="chat-messages">
        <template v-if="messages.length">
          <div
            v-for="message in messages"
            :key="message.id"
            class="q-mb-md row no-wrap"
            :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="chat-bubble"
              :class="message.role === 'user' ? 'bubble-user' : 'bubble-assistant'"
            >
              <div class="bubble-author text-caption text-grey-5 q-mb-xs">
                {{ message.role === 'user' ? 'You' : 'Assistant' }}
              </div>
              <div class="bubble-content">
                {{ message.content }}
              </div>
              <div class="bubble-timestamp text-caption text-grey-5 q-mt-sm">
                {{ formatTimestamp(message.createdAt) }}
              </div>
            </div>
          </div>
        </template>

        <div v-else class="empty-state column items-center justify-center">
          <q-icon name="chat_bubble_outline" size="48px" class="q-mb-md text-primary" />
          <div class="text-subtitle1 text-center text-white">
            Ask anything about cars
          </div>
          <div class="text-body2 text-center text-grey-4">
            I will query the RAG API and keep the full history here.
          </div>
        </div>
      </div>

      <div class="chat-input-wrapper">
        <q-form class="chat-input" @submit.prevent="handleSubmit">
          <q-input
            v-model="prompt"
            type="textarea"
            autogrow
            filled
            dense
            dark
            placeholder="Type your question..."
            :disable="loading"
            maxlength="4000"
            class="chat-textarea"
            input-class="text-white"
            color="white"
          />
          <q-btn
            type="submit"
            color="primary"
            glossy
            round
            icon="send"
            class="chat-send-btn"
            :loading="loading"
            :disable="loading || prompt.trim().length === 0"
          />
        </q-form>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';
import { useChatStore } from 'src/stores/chat-store';

const $q = useQuasar();
const chatStore = useChatStore();
const { messages, loading } = storeToRefs(chatStore);

const prompt = ref('');
const messagesContainer = ref<HTMLDivElement | null>(null);

const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
  const el = messagesContainer.value;
  if (!el) {
    return;
  }

  if (typeof el.scrollTo === 'function') {
    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    });
    return;
  }

  el.scrollTop = el.scrollHeight;
};

const scheduleScrollToBottom = (behavior: ScrollBehavior = 'auto') => {
  if (typeof window === 'undefined') {
    return;
  }

  void nextTick(() => {
    window.requestAnimationFrame(() => {
      try {
        scrollToBottom(behavior);
      } catch (error) {
        console.error('Error scrolling to bottom:', error);
      }
    });
  });
};

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const handleSubmit = async () => {
  const query = prompt.value.trim();
  if (!query || loading.value) {
    return;
  }

  prompt.value = '';

  try {
    await chatStore.askRag(query);
  } catch (error) {
    // api error already creates a message, but we also notify
    $q.notify({
      type: 'negative',
      message: 'Failed to reach the RAG service. Please try again.',
    });
    console.error(error);
  }
};

onMounted(() => {
  chatStore.initFromStorage();
  scheduleScrollToBottom();
});

watch(
  () => messages.value.length,
  () => {
    scheduleScrollToBottom('smooth');
  },
  { flush: 'post' }
);
</script>

<style scoped lang="scss">
.chat-page {
  height: 100%;
  padding: 24px 12px 32px;
  background: radial-gradient(circle at top, #1e1b4b, #020617 55%);
  display: flex;
  justify-content: center;
  color: #e2e8f0;
}

.chat-shell {
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 24px;
  border: 1px solid rgba(94, 96, 206, 0.35);
  background: rgba(2, 6, 23, 0.7);
  backdrop-filter: blur(18px);
  box-shadow: 0 30px 100px rgba(2, 6, 23, 0.75);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 32px 28px 140px;
}

.chat-bubble {
  max-width: 720px;
  width: fit-content;
  padding: 16px 20px;
  border-radius: 22px;
  display: inline-block;
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.35);
}

.bubble-user {
  margin-left: auto;
  background: var(--q-color-primary);
  color: #f8fafc;
  border-bottom-right-radius: 8px;
}

.bubble-assistant {
  margin-right: auto;
  background: rgba(15, 23, 42, 0.9);
  color: #e2e8f0;
  border-bottom-left-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.bubble-author {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(248, 250, 252, 0.75);
}

.bubble-content {
  white-space: pre-wrap;
  line-height: 1.55;
  font-size: 1rem;
}

.bubble-timestamp {
  text-align: right;
  color: rgba(226, 232, 240, 0.7);
}

.empty-state {
  flex: 1;
  text-align: center;
  color: #cbd5f5;
}

.chat-input-wrapper {
  position: sticky;
  bottom: 0;
  padding: 18px 28px 28px;
  background: linear-gradient(180deg, rgba(2, 6, 23, 0) 0%, rgba(2, 6, 23, 0.85) 60%, rgba(2, 6, 23, 1) 100%);
  border-top: 1px solid rgba(94, 96, 206, 0.35);
}

.chat-input {
  display: flex;
  gap: 12px;
  width: 100%;
  align-items: flex-end;
}

.chat-textarea {
  flex: 1;
}

.chat-textarea :deep(.q-field__control) {
  background: rgba(15, 23, 42, 0.95);
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  min-height: 74px;
}

.chat-textarea :deep(textarea) {
  color: #f8fafc;
  line-height: 1.45;
}

.chat-send-btn {
  align-self: flex-end;
  width: 48px;
  height: 48px;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 999px;
}
</style>
