<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useForm, validators, validateForm } from '@/composables/useForm';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const step = ref<'request' | 'reset'>('request');
const form = useForm({
  email: '',
  password: '',
  confirmPassword: '',
});

const validationRules = {
  email: [validators.required('Email obligatorio'), validators.email()],
  password: [
    validators.required('Contraseña obligatoria'),
    validators.minLength(8, 'Mínimo 8 caracteres'),
  ],
  confirmPassword: [
    validators.required('Confirma la contraseña'),
    (value: string) => value !== form.values.password ? 'Las contraseñas no coinciden' : null,
  ],
};

async function handleRequestReset(): Promise<void> {
  await form.handleSubmit(
    async (values) => {
      try {
        await authStore.resetPassword(values.email);
        step.value = 'reset';
        form.reset();
      } catch (e: any) {
        form.setError('email', e.message || 'Error al enviar email');
      }
    },
    (values) => validateForm(values, { email: validationRules.email })
  );
}

async function handleResetPassword(): Promise<void> {
  await form.handleSubmit(
    async (values) => {
      try {
        await authStore.updatePassword(values.password);
        router.push('/login');
      } catch (e: any) {
        form.setError('password', e.message || 'Error al actualizar contraseña');
      }
    },
    (values) => validateForm(values, {
      password: validationRules.password,
      confirmPassword: validationRules.confirmPassword,
    })
  );
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <div class="mx-auto h-12 w-12 bg-primary-500 rounded-xl flex items-center justify-center">
          <Lock class="w-7 h-7 text-white" />
        </div>
        <h2 class="mt-6 text-3xl font-bold text-gray-900">
          {{ step === 'request' ? 'Recuperar contraseña' : 'Nueva contraseña' }}
        </h2>
        <p class="mt-2 text-gray-600">
          {{ step === 'request'
            ? 'Te enviaremos un email para restablecer tu contraseña'
            : 'Introduce tu nueva contraseña' }}
        </p>
      </div>

      <Card class="p-8 space-y-6">
        <!-- Paso 1: Solicitar reset -->
        <form v-if="step === 'request'" @submit.prevent="handleRequestReset" class="space-y-4">
          <Input
            v-model="form.values.email"
            :error="form.getError('email')"
            label="Email"
            placeholder="tu@email.com"
            type="email"
            icon="Mail"
            autocomplete="email"
          />

          <Button
            type="submit"
            full-width
            :loading="form.submitting"
            :disabled="!form.isValid"
            size="lg"
          >
            <Loader2 v-if="form.submitting" class="w-5 h-5 animate-spin" />
            Enviar email de recuperación
          </Button>
        </form>

        <!-- Paso 2: Nueva contraseña -->
        <form v-else @submit.prevent="handleResetPassword" class="space-y-4">
          <div v-if="route.query.token" class="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle class="w-5 h-5 flex-shrink-0" />
            <p class="text-sm">Token válido. Introduce tu nueva contraseña.</p>
          </div>

          <div v-else class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-700">
            <AlertCircle class="w-5 h-5 flex-shrink-0" />
            <p class="text-sm">Accediste sin token. Si el email no llega, revisa spam.</p>
          </div>

          <Input
            v-model="form.values.password"
            :error="form.getError('password')"
            label="Nueva contraseña"
            placeholder="••••••••"
            type="password"
            icon="Lock"
            autocomplete="new-password"
          />

          <Input
            v-model="form.values.confirmPassword"
            :error="form.getError('confirmPassword')"
            label="Confirmar nueva contraseña"
            placeholder="••••••••"
            type="password"
            icon="Lock"
            autocomplete="new-password"
          />

          <Button
            type="submit"
            full-width
            :loading="form.submitting"
            :disabled="!form.isValid"
            size="lg"
          >
            <Loader2 v-if="form.submitting" class="w-5 h-5 animate-spin" />
            Actualizar contraseña
          </Button>
        </form>

        <div v-if="authStore.error" class="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle class="w-5 h-5 flex-shrink-0" />
          <p class="text-sm">{{ authStore.error }}</p>
        </div>

        <div class="text-center">
          <RouterLink to="/login" class="text-sm text-primary-600 hover:text-primary-500 flex items-center gap-1 justify-center">
            <ArrowLeft class="w-4 h-4" />
            Volver al login
          </RouterLink>
        </div>
      </Card>
    </div>
  </div>
</template>