<script setup lang="ts">
const url = ref<string>('https://letterboxd.com/meagan/list/stuff-by-women-about-women')

const domain = useRuntimeConfig().public.domain

const pathname = computed(() => {
  const urlObject = new URL(url.value)
  return urlObject.pathname
})

const convertedUrl = computed(() => {
  return `${domain}/letterboxd${pathname.value}`
})

const externalApiUrl = computed(() => {
  return `https://letterboxd-list-radarr.onrender.com${pathname.value}`
})
</script>

<template>
  <ServiceSection title="Letterboxd">
    <UForm>
      <UFormField label="URL" namew="url">
        <UInput v-model="url" placeholder="List URL" class="w-full" />
      </UFormField>
      <div class="py-4">
        <ULink :href="convertedUrl" target="_blank">
          {{ convertedUrl }}
        </ULink>
      </div>
      <div class="py-4">
        <ULink :href="externalApiUrl" target="_blank">
          {{ externalApiUrl }}
        </ULink>
      </div>
      <div>
        <UButton :href="convertedUrl" target="_blank">
          Go to URL
        </UButton>
      </div>
    </UForm>
  </ServiceSection>
</template>
