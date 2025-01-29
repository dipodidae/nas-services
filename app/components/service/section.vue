<script lang="ts" setup>
const props = defineProps<{
  title: string
}>()
</script>

<template>
  <section class="bg-zinc-800 rounded-lg my-4">
    <h2 class="text-2xl font-bold text-white p-8 border-b border-b-zinc-600">
      {{ props.title }}
    </h2>
    <div class="p-8">
      <slot />
    </div>
  </section>
</template>
