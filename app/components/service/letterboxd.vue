<script setup lang="ts">
const url = ref<string>('https://letterboxd.com/meagan/list/stuff-by-women-about-women')

const pathname = computed(() => {
  const urlObject = new URL(url.value)
  return urlObject.pathname
})

const requestUrl = useRequestURL()

const currentUrl = computed(() => {
  return `${requestUrl.protocol}//${requestUrl.host}/letterboxd${pathname.value}`
})
</script>

<template>
  <ServiceSection title="Letterboxd">
    <UFormField label="URL" namew="url">
      <UInput v-model="url" placeholder="List URL" class="w-full" />
    </UFormField>

    <div class="py-4">
      <pre>
        {{ JSON.stringify(requestUrl, null, 2) }}
      </pre>
      <ULink :href="currentUrl" target="_blank">
        {{ currentUrl }}
      </ULink>
    </div>
  </ServiceSection>
</template>
