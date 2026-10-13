<script setup lang="ts">
import { onMounted } from 'vue';
import { useSubjectsStore } from '@/stores/subjects';
import { SubjectManager } from '@/components/admin';

const subjectsStore = useSubjectsStore();

onMounted(async () => {
  await subjectsStore.fetchAll();
});
</script>

<template>
  <div class="flex-1 overflow-auto p-6 lg:p-8">
    <div class="max-w-4xl mx-auto">
      <SubjectManager />
    </div>
  </div>
</template>