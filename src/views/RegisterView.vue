<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useForm, validators, validateForm } from '@/composables/useForm';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, UserPlus } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

const showPassword = ref(false);
const showConfirmPassword = ref(false);

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
    validators.pattern(/[A-Z]/, 'Debe tener una mayúscula'),
    validators.pattern(/[a-z]/, 'Debe tener una minúscula'),
    validators.pattern(/[0-9]/, 'Debe tener un número'),
  ],
  confirmPassword: [
    validators.required('Confirma la contraseña'),
    (value: string) => value !== form.values.password ? 'Las contraseñas no coinciden' : null,
  ],
};

const passwordChecks = computed(() => ({
  length: form.values.password.length >= 8,
  uppercase: /[A-Z]/.test(form.values.password),
  lowercase: /[a-z]/.test(form.values.password),
  number: /[0-9]/.test(form.values.password),
}));

const passwordStrengthHint = computed(() => {
  const pass = form.values.password;
  if (!pass) return 'Mínimo 8 caracteres, mayúscula, minúscula y número';
  const checks = passwordChecks.value;
  const passed = Object.values(checks).filter(Boolean).length;
  return `Fortaleza: ${passed}/4 ${passed === 4 ? '✓' : ''}`;
});

async function handleSubmit(): Promise<void> {
  await form.handleSubmit(
    async (values) => {
      try {
        await authStore.signUp(values.email, values.password);
        router.push('/');
      } catch (e: any) {
        form.setError('email', e.message || 'Error al registrarse');
      }
    },
    (values) => validateForm(values, validationRules)
  );
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <div class="mx-auto h-12 w-12 bg-primary-500 rounded-xl flex items-center justify-center">
          <UserPlus class="w-7 h-7 text-white" />
        </div>
        <h2 class="mt-6 text-3xl font-bold text-gray-900">Crear cuenta</h2>
        <p class="mt-2 text-gray-600">Regístrate para empezar a gestionar tus clases</p>
      </div>

      <Card class="p-8 space-y-6">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <Input
            v-model="form.values.email"
            :error="form.getError('email')"
            label="Email"
            placeholder="tu@email.com"
            type="email"
            icon="Mail"
            autocomplete="email"
          />

          <div class="relative">
            <Input
              v-model="form.values.password"
              :error="form.getError('password')"
              :type="showPassword ? 'text' : 'password'"
              label="Contraseña"
              placeholder="••••••••"
              icon="Lock"
              autocomplete="new-password"
              :hint="passwordStrengthHint"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
              aria-label="Mostrar/ocultar contraseña"
            >
              <component :is="showPassword ? EyeOff : Eye" class="w-5 h-5" />
            </button>
          </div>

          <div class="relative">
            <Input
              v-model="form.values.confirmPassword"
              :error="form.getError('confirmPassword')"
              :type="showConfirmPassword ? 'text' : 'password'"
              label="Confirmar contraseña"
              placeholder="••••••••"
              icon="Lock"
              autocomplete="new-password"
            />
            <button
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              class="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
              aria-label="Mostrar/ocultar contraseña"
            >
              <component :is="showConfirmPassword ? EyeOff : Eye" class="w-5 h-5" />
            </button>
          </div>

          <div class="text-sm text-gray-500 space-y-1">
            <p>La contraseña debe tener:</p>
            <ul class="list-disc list-inside space-y-1">
              <li :class="passwordChecks.length ? 'text-green-600' : 'text-gray-400'">Mínimo 8 caracteres</li>
              <li :class="passwordChecks.uppercase ? 'text-green-600' : 'text-gray-400'">Una mayúscula</li>
              <li :class="passwordChecks.lowercase ? 'text-green-600' : 'text-gray-400'">Una minúscula</li>
              <li :class="passwordChecks.number ? 'text-green-600' : 'text-gray-400'">Un número</li>
            </ul>
          </div>

          <Button
            type="submit"
            full-width
            :loading="form.submitting"
            :disabled="!form.isValid"
            size="lg"
          >
            <Loader2 v-if="form.submitting" class="w-5 h-5 animate-spin" />
            <UserPlus class="w-5 h-5" v-else />
            Crear cuenta
          </Button>
        </form>

        <div v-if="authStore.error" class="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle class="w-5 h-5 flex-shrink-0" />
          <p class="text-sm">{{ authStore.error }}</p>
        </div>

        <div class="text-center">
          <p class="text-sm text-gray-600">
            ¿Ya tienes cuenta?
            <RouterLink to="/login" class="font-medium text-primary-600 hover:text-primary-500 ml-1">
              Inicia sesión
            </RouterLink>
          </p>
        </div>
      </Card>
    </div>
  </div>
</template>