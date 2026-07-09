<template>
  <div class="settings-card about-card">
    <div class="settings-section-title">关于</div>
    <div v-html="aboutContentHtml"></div>
  </div>
</template>

<script setup>
defineProps({
  aboutContentHtml: { type: String, required: true }
})
</script>
