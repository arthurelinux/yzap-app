<template>
  <!-- Cabeçalho de página do spike: título em negrito + subtítulo com borda esquerda. -->
  <div class="page-head">
    <span class="page-title">{{ title }}</span>
    <span v-if="sub" class="page-sub">{{ sub }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; sub?: string }>()
</script>
