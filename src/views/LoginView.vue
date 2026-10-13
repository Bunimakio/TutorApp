<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useForm, validators, validateForm } from '@/composables/useForm';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, LayoutDashboard } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const showPassword = ref(false);
const redirect = route.query.redirect as string || '/';

const supabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  !import.meta.env.VITE_SUPABASE_URL.includes('supabase.com/dashboard') &&
  !import.meta.env.VITE_SUPABASE_URL.includes('tu-proyecto') &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('tu-anon-key')
);

const form = useForm({
  email: '',
  password: '',
});

const validationRules = {
  email: [validators.required('Email obligatorio'), validators.email()],
  password: [validators.required('Contraseña obligatoria')],
};

async function handleSubmit(): Promise<void> {
  await form.handleSubmit(
    async (values) => {
      try {
        await authStore.signIn(values.email, values.password);
        router.push(redirect);
      } catch (e: any) {
        form.setError('password', e.message || 'Credenciales inválidas');
      }
    },
    (values) => validateForm(values, validationRules)
  );
}

function handleForgotPassword(): void {
  router.push({ name: 'reset-password' });
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Logo y título -->
      <div class="text-center">
        <div class="mx-auto h-12 w-12 bg-primary-500 rounded-xl flex items-center justify-center">
          <LayoutDashboard class="w-7 h-7 text-white" />
        </div>
        <h2 class="mt-6 text-3xl font-bold text-gray-900">Iniciar sesión</h2>
        <p class="mt-2 text-gray-600">Accede a tu agenda de clases particulares</p>
      </div>

      <!-- Formulario -->
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
              autocomplete="current-password"
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

          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2">
              <input type="checkbox" class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
              <span class="text-sm text-gray-600">Recordarme</span>
            </label>
            <button type="button" @click="handleForgotPassword" class="text-sm text-primary-600 hover:text-primary-500">
              ¿Olvidaste la contraseña?
            </button>
          </div>

          <Button
            type="submit"
            full-width
            :loading="form.submitting"
            :disabled="!form.isValid"
            size="lg"
          >
            <Loader2 v-if="form.submitting" class="w-5 h-5 animate-spin" />
            Iniciar sesión
          </Button>
        </form>

        <div v-if="authStore.error" class="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle class="w-5 h-5 flex-shrink-0" />
          <p class="text-sm">{{ authStore.error }}</p>
        </div>

        <div class="text-center">
          <p class="text-sm text-gray-600">
            ¿No tienes cuenta?
            <RouterLink to="/register" class="font-medium text-primary-600 hover:text-primary-500 ml-1">
              Regístrate
            </RouterLink>
          </p>
        </div>
      </Card>

      <!-- Demo info -->
      <div v-if="!supabaseConfigured" class="text-center text-sm text-gray-500">
        <p>Demo: Configura tu Supabase en <code class="bg-gray-100 px-1.5 py-0.5 rounded text-primary-600">.env.local</code></p>
      </div>
    </div>
  </div>
</template>