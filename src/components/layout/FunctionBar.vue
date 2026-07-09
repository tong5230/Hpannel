<template>
  <!-- 主页面功能栏：承载全局折叠与健康异常筛选入口，不直接修改业务数据。 -->
  <div class="function-bar">
    <button class="function-btn" @click="$emit('toggle-all-categories')" :title="allCollapsed ? '展开全部分类' : '折叠全部分类'">
      <span class="collapse-icon">{{ allCollapsed ? '▶' : '▼' }}</span>
      <span class="function-text">全部分类</span>
    </button>
    <button
      v-if="healthFeatureOn"
      class="function-btn health-abnormal-filter-btn"
      :class="{ 'is-active': healthOnlyAbnormalFilter }"
      @click="$emit('toggle-health-abnormal-filter')"
      :title="healthOnlyAbnormalFilter ? '退出仅看异常' : '仅看异常（跨分类聚合离线/超时条目）'"
    >
      <span class="health-abnormal-filter-icon">⚠</span>
      <span class="function-text">仅看异常<span v-if="healthAbnormalCount > 0" class="health-abnormal-filter-count">{{ healthAbnormalCount }}</span></span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  allCollapsed: { type: Boolean, required: true },
  healthFeatureOn: { type: Boolean, default: false },
  healthOnlyAbnormalFilter: { type: Boolean, default: false },
  healthAbnormalCount: { type: Number, default: 0 }
})

defineEmits(['toggle-all-categories', 'toggle-health-abnormal-filter'])
</script>
