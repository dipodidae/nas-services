<script lang="ts" setup>
const event = {
  eventType: 'Download',
  movie: {
    title: 'Test Movie',
  },
  remoteMovie: {
    title: 'Test Remote Movie',
    year: 2021,
    imdbId: 'tt1234567',
  },
  release: {
    quality: 'HD',
    size: 1500,
  },
}

const { execute, data, error } = useFetch('/x/radarr', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(event),
  immediate: false,
})
</script>

<template>
  <ServiceSection title="X / Twitter">
    <div class="flex gap-2">
      <UButton @click="() => execute()">
        Test (Radarr)
      </UButton>
      <UButton to="/api/auth/twitter/authenticate">
        Log in
      </UButton>
    </div>
    <div v-if="error" class="bg-red-100 border border-red-500 text-red-900">
      <div v-if="error.statusCode">
        {{ error.statusCode }}
      </div>
      <div v-if="error.statusMessage">
        {{ error.statusMessage }}
      </div>
      <div v-if="error.message">
        {{ error.message }}
      </div>
    </div>
    <div v-if="data" class="my-4 border border-gray-200 rounded">
      <div class="border-b border-b-gray-200 p-4 font-bold">
        Response
      </div>
      <div class="p-4 font-mono">
        {{ data }}
      </div>
    </div>
  </ServiceSection>
</template>
