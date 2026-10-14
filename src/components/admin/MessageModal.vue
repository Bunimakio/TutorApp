<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useStudentsStore } from '@/stores/students';
import { db } from '@/lib/supabase';
import { groupStudents, isValidEmail, pickRecipients, sendMessages, type MailRecipient, type RecipientGroups } from '@/lib/mailer';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Badge from '@/components/ui/Badge.vue';
import { Send, Mail, Users, Search, AlertTriangle, CheckCircle2 } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
  sent: [result: { sent: number; failed: number; failedList: Array<{ email: string; error: string }> }];
}>();

const studentsStore = useStudentsStore();

const mode = ref<'all' | 'pick'>('all');
const selectedIds = ref<string[]>([]);
const search = ref('');
const subject = ref('');
const body = ref('');
const sending = ref(false);
const progress = ref({ current: 0, total: 0 });
const sentToday = ref(0);
const includeOptedOut = ref(false);
const result = ref<null | { sent: number; failed: number; failedList: Array<{ email: string; error: string }> }>(null);
const error = ref('');

const groups = computed<RecipientGroups>(() => groupStudents(studentsStore.students));

const filteredPick = computed(() => {
  let list = [...studentsStore.students];
  const q = search.value.trim().toLowerCase();
  if (q) {
    list = list.filter(s => s.full_name.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q));
  }
  return list;
});

const previewRecipients = computed<MailRecipient[]>(() => {
  return pickRecipients(studentsStore.students, {
    all: mode.value === 'all',
    selectedIds: selectedIds.value,
    includeOptedOut: includeOptedOut.value,
  });
});

const canSend = computed(() => {
  if (sending.value) return false;
  const trimmedSub = subject.value.trim();
  const trimmedBody = body.value.trim();
  if (!trimmedSub || !trimmedBody) return false;
  if (mode.value === 'pick' && selectedIds.value.length === 0) return false;
  return previewRecipients.value.length > 0;
});

watch(() => props.modelValue, async open => {
  if (open) {
    await studentsStore.fetchAll();
    await loadSentToday();
    resetForm();
  }
});

async function loadSentToday(): Promise<void> {
  try {
    const mod = await import('@/lib/mailer');
    sentToday.value = await mod.getSentTodayCount();
  } catch {
    sentToday.value = 0;
  }
}

function getSentTodayCount(): Promise<number> {
  return import('@/lib/mailer').then(mod => mod.getSentTodayCount());
}

function resetForm(): void {
  mode.value = 'all';
  selectedIds.value = [];
  search.value = '';
  subject.value = '';
  body.value = '';
  error.value = '';
  result.value = null;
  progress.value = { current: 0, total: 0 };
  includeOptedOut.value = false;
}

function toggleId(id: string): void {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(id);
}

function toggleAllPick(): void {
  if (selectedIds.value.length === filteredPick.value.length) {
    selectedIds.value = [];
  } else {
    selectedIds.value = filteredPick.value.map(s => s.id);
  }
}

async function handleSend(): Promise<void> {
  if (!canSend.value) return;

  const recipients = pickRecipients(studentsStore.students, {
    all: mode.value === 'all',
    selectedIds: selectedIds.value,
    includeOptedOut: includeOptedOut.value,
  });

  if (!recipients.length) return;

  sending.value = true;
  error.value = '';
  result.value = null;
  progress.value = { current: 0, total: recipients.length };

  try {
    const data = await sendMessages(recipients, subject.value, body.value, {
      onProgress: (current, total) => {
        progress.value = { current, total };
      },
    });
    await logMessages(recipients, subject.value, body.value, data);

    const failedList = data.failed.map(f => ({ email: f.email, error: f.error }));
    result.value = {
      sent: data.sent.length,
      failed: failedList.length,
      failedList,
    };
    await loadSentToday();
    emit('sent', result.value);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    error.value = msg;
  } finally {
    sending.value = false;
  }
}

async function logMessages(
  recipients: MailRecipient[],
  subjectTxt: string,
  bodyTxt: string,
  data: { sent: string[]; failed: Array<{ email: string; error: string }> }
): Promise<void> {
  const now = new Date().toISOString();
  const { data: session } = await (await import('@/lib/supabase')).supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) return;

  const toInsert: any[] = [];
  const sentSet = new Set(data.sent);
  const failedMap = new Map(data.failed.map(f => [f.email, f.error]));

  for (const r of recipients) {
    const email = r.email;
    const studentId = r.student_id;
    if (sentSet.has(email)) {
      toInsert.push({
        user_id: userId,
        student_id: studentId,
        to_email: email,
        subject: subjectTxt.trim(),
        body: bodyTxt.trim(),
        kind: 'manual',
        status: 'sent',
        error: null,
        sent_at: now,
      });
    } else if (failedMap.has(email)) {
      toInsert.push({
        user_id: userId,
        student_id: studentId,
        to_email: email,
        subject: subjectTxt.trim(),
        body: bodyTxt.trim(),
        kind: 'manual',
        status: 'error',
        error: failedMap.get(email),
        sent_at: now,
      });
    }
  }

  if (toInsert.length) {
    await db.messages.insert(toInsert as any).catch(() => undefined);
  }
}

function close(): void {
  emit('update:modelValue', false);
  emit('close');
}

onMounted(async () => {
  if (props.modelValue) {
    await studentsStore.fetchAll();
    await loadSentToday();
  }
});
</script>

<template>
  <Modal
    :modelValue="props.modelValue"
    title="Mensajería"
    size="xl"
    @update:modelValue="close"
    @close="close"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
        <div class="flex items-center gap-2">
          <Mail class="w-4 h-4" />
          <span>Envío manual a los alumnos (máx. 200 por envío)</span>
        </div>
        <div class="flex items-center gap-2">
          <span>Hoy se enviaron</span>
          <Badge :variant="sentToday > 250 ? 'warning' : sentToday > 200 ? 'warning' : 'info'" size="sm">{{ sentToday }}</Badge>
          <span>correos</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 border border-gray-200 rounded-lg p-2">
        <Button
          type="button"
          :variant="mode === 'all' ? 'primary' : 'ghost'"
          size="sm"
          @click="mode = 'all'; includeOptedOut = false"
        >
          <Users class="w-4 h-4" />
          Enviar a todos
        </Button>
        <Button
          type="button"
          :variant="mode === 'pick' ? 'primary' : 'ghost'"
          size="sm"
          @click="mode = 'pick'"
        >
          <Search class="w-4 h-4" />
          Elegir alumnos
        </Button>
      </div>

      <div v-if="mode === 'all'" class="border border-gray-200 rounded-lg p-3 space-y-2">
        <div class="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span>Pueden recibir: <strong class="text-gray-900">{{ groups.sendable.length }}</strong></span>
          <span>Sin correo: <strong class="text-gray-900">{{ groups.withoutEmail.length }}</strong></span>
          <span>No reciben correos: <strong class="text-gray-900">{{ groups.optedOut.length }}</strong></span>
        </div>
        <label v-if="groups.optedOut.length > 0" class="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" v-model="includeOptedOut" class="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
          <span>Incluir también a los que pidieron no recibir correos (forzarlo con advertencia)</span>
        </label>
      </div>

      <div v-if="mode === 'pick'" class="border border-gray-200 rounded-lg p-3 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <Input v-model="search" placeholder="Buscar por nombre o correo" class="flex-1" icon="Search" />
          <Button type="button" variant="ghost" size="sm" @click="toggleAllPick">
            {{ selectedIds.length === filteredPick.length && selectedIds.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos' }}
          </Button>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span>Seleccionados: <strong class="text-gray-900">{{ selectedIds.length }}</strong></span>
          <span>Enviar a: <strong class="text-gray-900">{{ previewRecipients.length }}</strong></span>
          <span>Sin correo: <strong class="text-gray-900">{{ filteredPick.filter(s => !isValidEmail(s.email)).length }}</strong></span>
        </div>
        <div class="max-h-48 overflow-auto border border-gray-200 rounded-md divide-y divide-gray-200">
          <label
            v-for="student in filteredPick"
            :key="student.id"
            class="flex items-start gap-2 p-2 hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="selectedIds.includes(student.id)"
              @change="toggleId(student.id)"
              :disabled="!isValidEmail(student.email)"
              class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-gray-900 break-words">{{ student.full_name }}</span>
                <Badge v-if="student.notify_email === false" variant="warning" size="sm">No recibe</Badge>
                <Badge v-if="!isValidEmail(student.email)" variant="default" size="sm">Sin correo</Badge>
              </div>
              <p v-if="student.email" class="text-xs text-gray-500 break-all">{{ student.email }}</p>
              <p v-else class="text-xs text-gray-500">No hay correo cargado</p>
            </div>
          </label>
        </div>
        <div v-if="selectedIds.length > 0 && mode === 'pick'" class="flex items-start gap-2 text-xs text-gray-700 bg-yellow-50 border border-yellow-200 rounded-md p-2">
          <AlertTriangle class="w-4 h-4 mt-0.5 text-yellow-600" />
          <span>
            Los alumnos marcados con "No recibe" fueron elegidos a mano. Se les enviará el correo igual (con advertencia).
          </span>
        </div>
      </div>

      <Input v-model="subject" label="Asunto" placeholder="Ej. Recordatorio de clase" />

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
        <textarea
          v-model="body"
          rows="6"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder-gray-400 resize-none"
          placeholder="Escribí el aviso para los destinatarios..."
        />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
        <div>
          Se enviará a <strong class="text-gray-900">{{ previewRecipients.length }}</strong> alumno/s
        </div>
        <div v-if="sending" class="flex items-center gap-2">
          <span>Enviando {{ progress.current }} de {{ progress.total }}…</span>
        </div>
      </div>

      <div v-if="error" class="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
        <AlertTriangle class="w-4 h-4 mt-0.5" />
        <span>{{ error }}</span>
      </div>

      <div v-if="result" class="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-2">
        <CheckCircle2 class="w-4 h-4 mt-0.5" />
        <div class="space-y-1">
          <p>Enviado a <strong>{{ result.sent }}</strong> alumno/s.</p>
          <p v-if="result.failed > 0">Hubo <strong>{{ result.failed }}</strong> error/es:</p>
          <ul v-if="result.failed > 0" class="list-disc pl-4">
            <li v-for="(f, idx) in result.failedList.slice(0, 5)" :key="idx">
              {{ f.email }}: {{ f.error }}
            </li>
            <li v-if="result.failedList.length > 5">y {{ result.failedList.length - 5 }} más…</li>
          </ul>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <Button type="button" variant="ghost" @click="close">Cancelar</Button>
        <Button type="button" :loading="sending" :disabled="!canSend" @click="handleSend">
          <Send class="w-4 h-4" />
          Enviar
        </Button>
      </div>
    </div>
  </Modal>
</template>
