// Composable para formularios y validación
import { computed, reactive, ref } from 'vue';

export interface FieldError {
  field: string;
  message: string;
}

export function useForm<T extends Record<string, any>>(initialValues: T) {
  const values = reactive({ ...initialValues }) as T;
  const errors = ref<FieldError[]>([]);
  const touched = ref<Record<string, boolean>>({});
  const submitting = ref(false);
  const submitCount = ref(0);

  const isValid = computed(() => errors.value.length === 0);
  const isDirty = computed(() => {
    return Object.keys(values).some(key => (values as any)[key] !== (initialValues as any)[key]);
  });

  function getError(field: string): string | undefined {
    return errors.value.find(e => e.field === field)?.message;
  }

  function hasError(field: string): boolean {
    return errors.value.some(e => e.field === field);
  }

  function setError(field: string, message: string): void {
    errors.value = errors.value.filter(e => e.field !== field);
    errors.value.push({ field, message });
  }

  function clearError(field: string): void {
    errors.value = errors.value.filter(e => e.field !== field);
  }

  function clearErrors(): void {
    errors.value = [];
  }

  function setValue(field: string, value: any): void {
    (values as any)[field] = value;
    clearError(field);
  }

  function setValues(newValues: Partial<T>): void {
    Object.assign(values, newValues);
    clearErrors();
  }

  function touch(field: string): void {
    touched.value[field] = true;
  }

  function touchAll(): void {
    Object.keys(values).forEach(key => {
      touched.value[key] = true;
    });
  }

  function isTouched(field: string): boolean {
    return !!touched.value[field];
  }

  function reset(): void {
    Object.keys(values).forEach(key => {
      delete (values as any)[key];
    });
    Object.assign(values, initialValues);
    errors.value = [];
    touched.value = {};
    submitting.value = false;
  }

  async function handleSubmit(
    submitFn: (values: T) => Promise<void>,
    validateFn?: (values: T) => FieldError[] | Promise<FieldError[]>
  ): Promise<boolean> {
    touchAll();

    if (validateFn) {
      const validationErrors = await validateFn(values);
      if (validationErrors.length > 0) {
        errors.value = validationErrors;
        return false;
      }
    }

    submitting.value = true;
    try {
      await submitFn(values);
      submitCount.value++;
      return true;
    } catch (e) {
      return false;
    } finally {
      submitting.value = false;
    }
  }

  // Se devuelve un objeto reactivo para que los refs anidados
  // (values, errors, submitting, isValid...) se desenvuelvan solos en las plantillas.
  return reactive({
    values,
    errors,
    touched,
    submitting,
    submitCount,
    isValid,
    isDirty,
    getError,
    hasError,
    setError,
    clearError,
    clearErrors,
    setValue,
    setValues,
    touch,
    touchAll,
    isTouched,
    reset,
    handleSubmit,
  });
}

// Validadores comunes
export const validators = {
  required: (message = 'Este campo es obligatorio') => (value: any) =>
    !value || (typeof value === 'string' && !value.trim()) ? message : null,

  email: (message = 'Email inválido') => (value: string) =>
    value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? message : null,

  minLength: (min: number, message?: string) => (value: string) =>
    value && value.length < min ? message || `Mínimo ${min} caracteres` : null,

  maxLength: (max: number, message?: string) => (value: string) =>
    value && value.length > max ? message || `Máximo ${max} caracteres` : null,

  pattern: (regex: RegExp, message = 'Formato inválido') => (value: string) =>
    value && !regex.test(value) ? message : null,

  numeric: (message = 'Debe ser un número') => (value: any) =>
    value !== '' && value !== null && isNaN(Number(value)) ? message : null,

  positive: (message = 'Debe ser positivo') => (value: number) =>
    value !== null && value !== undefined && value <= 0 ? message : null,

  min: (min: number, message?: string) => (value: any) =>
    value !== null && value !== undefined && value !== '' && Number(value) < min
      ? message || `El valor mínimo es ${min}`
      : null,
};

export function validateForm<T extends Record<string, any>>(
  values: T,
  rules: Record<keyof T, ((value: any) => string | null)[]>
): FieldError[] {
  const errors: FieldError[] = [];

  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = values[field];
    for (const rule of fieldRules) {
      const error = rule(value);
      if (error) {
        errors.push({ field, message: error });
        break; // Primer error por campo
      }
    }
  }

  return errors;
}
