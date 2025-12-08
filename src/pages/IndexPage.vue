<template>
  <q-page class="chat-page bg-grey-2">
    <div class="chat-container">
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
              <div class="bubble-author text-caption text-grey-7 q-mb-xs">
                {{ message.role === 'user' ? 'You' : 'Assistant' }}
              </div>
              <div class="bubble-content">
                {{ message.content }}
              </div>
              <div class="bubble-timestamp text-caption text-grey-6 q-mt-sm">
                {{ formatTimestamp(message.createdAt) }}
              </div>
            </div>
          </div>
        </template>

        <div v-else class="empty-state column items-center justify-center text-grey-6">
          <q-icon name="chat_bubble_outline" size="56px" class="q-mb-md" />
          <div class="text-subtitle1 text-center">
            Start the conversation
          </div>
          <div class="text-body2 text-center">
            Ask anything about the cars and I will fetch an answer from the RAG API.
          </div>
        </div>
      </div>

      <q-separator />

      <q-form class="chat-input q-pt-md" @submit.prevent="handleSubmit">
        <div class="row items-end q-col-gutter-sm">
          <div class="col">
            <q-input
              v-model="prompt"
              type="textarea"
              autogrow
              placeholder="Type your question..."
              :disable="loading"
              maxlength="4000"
            />
          </div>
          <div class="col-auto">
            <q-btn
              type="submit"
              color="primary"
              round
              icon="send"
              :loading="loading"
              :disable="loading || prompt.trim().length === 0"
            />
          </div>
        </div>
      </q-form>
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

const scrollToBottom = () => {
  const el = messagesContainer.value;
  if (!el) {
    return;
  }

  el.scrollTop = el.scrollHeight;
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

  try {
    await chatStore.askRag(query);
    prompt.value = '';
  } catch (error) {
    // api error already creates a message, but we also notify
    $q.notify({
      type: 'negative',
      message: 'Failed to reach the RAG service. Please try again.',
    });
    console.error(error);
  }
};

onMounted(async () => {
  chatStore.initFromStorage();
  await nextTick();
  scrollToBottom();
});

watch(
  () => messages.value.length,
  async () => {
    try {
      await nextTick(scrollToBottom);
    } catch (error) {
      console.error('Error scrolling to bottom:', error);
    }
  }
);
</script>

<style scoped lang="scss">
.chat-page {
  height: 100%;
  padding: 16px;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 20px;
  background: white;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.chat-bubble {
  max-width: 720px;
  width: fit-content;
  padding: 12px 16px;
  border-radius: 18px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  display: inline-block;
}

.bubble-user {
  margin-left: auto;
  background: var(--q-color-primary);
  color: white;
  border-bottom-right-radius: 4px;
}

.bubble-assistant {
  margin-right: auto;
  background: var(--q-color-grey-1);
  color: var(--q-color-dark);
  border-bottom-left-radius: 4px;
}

.bubble-author {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bubble-content {
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 1rem;
}

.bubble-timestamp {
  text-align: right;
}

.empty-state {
  flex: 1;
  text-align: center;
}

.chat-input {
  padding: 0 24px 24px;
}
</style>
