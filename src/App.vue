<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import NavigationPanel from './NavigationPanel.vue'

const route = ref('')
const enterAction = ref({})

// 检查是否在uTools环境中运行
const isUtoolsEnv = ref(typeof window.utools !== 'undefined')

onMounted(() => {
  if (isUtoolsEnv.value) {
    window.utools.onPluginEnter((action) => {
      route.value = action.code
      enterAction.value = action
    })
    window.utools.onPluginOut((isKill) => {
      route.value = ''
    })
  }
})
</script>

<template>
  <!-- 在uTools环境中运行 -->
  <template v-if="isUtoolsEnv">
    <NavigationPanel></NavigationPanel>
  </template>
  
  <!-- 在浏览器中运行导航面板 -->
  <template v-else>
    <NavigationPanel></NavigationPanel>
  </template>
</template>
