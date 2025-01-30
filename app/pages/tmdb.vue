<script setup lang="ts">
const { data: json } = useTmdbData('/authentication')
</script>

<template>
  <div>
    {{ JSON.stringify(json) }}
  </div>
</template>
