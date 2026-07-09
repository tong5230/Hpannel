<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  showSeconds: {
    type: Boolean,
    default: false
  }
})

const currentTime = ref('')
const currentDate = ref('')
let timeInterval = null

const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const updateTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = props.showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`

  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  currentDate.value = `${month}/${day} ${weekdays[now.getDay()]}`
}

watch(
  () => props.showSeconds,
  () => {
    updateTime()
  }
)

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<template>
  <span class="clock-display">
    <span class="time">{{ currentTime }}</span>
    <span class="date">{{ currentDate }}</span>
  </span>
</template>

<style scoped>
.clock-display {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
}

.time {
  font-size: 1.1rem;
  font-weight: 500;
}

.date {
  font-size: 0.9rem;
  opacity: 0.9;
}
</style>
