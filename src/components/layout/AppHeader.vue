<template>
  <!-- 顶部标题栏：只负责展示入口与向父组件转发操作事件，业务状态仍由 NavigationPanel.vue 统一管理。 -->
  <div class="header">
    <div class="header-left" @click="$emit('open-settings')" style="cursor: pointer;" title="打开系统应用设置（分类管理、个性化、数据管理、关于）">
      <i class="logo-icon">🚀</i>
      <span class="title">导航面板</span>
      <ClockDisplay v-if="uiSettings.showClock" :show-seconds="uiSettings.showClockSeconds" />
    </div>
    <div v-if="uiSettings.showSearch" class="header-center">
      <input
        type="text"
        :value="searchQuery"
        placeholder="快速搜索喜欢和分类链接..."
        class="search-input"
        @input="$emit('update:searchQuery', $event.target.value)"
      />
    </div>
    <div class="header-right">
      <button v-if="uiSettings.showAddButton" class="icon-btn" @click="$emit('add-item')" title="添加链接">➕</button>
      <button v-if="uiSettings.showRefreshButton" class="icon-btn" @click="$emit('refresh')" title="刷新">🔄</button>
      <button
        v-if="healthFeatureOn && uiSettings.showHealthBadge"
        class="icon-btn health-global-badge"
        :class="{
          'health-badge-empty-state': healthEnabledItemCount === 0 && !healthIsChecking,
          'health-badge-all-online': healthEnabledItemCount > 0 && healthAbnormalCount === 0 && !healthIsChecking,
          'health-badge-abnormal': healthAbnormalCount > 0 && !healthIsChecking,
          'health-badge-checking': healthIsChecking
        }"
        @click="$emit('run-health-check')"
        :title="healthBadgeTitle"
      >
        <span v-if="healthIsChecking" class="health-spinner-mini"></span>
        <span v-else-if="healthEnabledItemCount === 0" class="health-badge-empty">0</span>
        <span v-else-if="healthAbnormalCount > 0" class="health-badge-num">{{ healthAbnormalCount }}</span>
        <span v-else class="health-badge-ok">✓</span>
      </button>
      <button v-if="uiSettings.showViewModeButton" class="icon-btn" @click="$emit('toggle-view-mode')" :title="viewMode === 'grid' ? '切换到列表视图' : '切换到网格视图'">
        {{ viewMode === 'grid' ? '☰' : '▦' }}
      </button>
      <button v-if="uiSettings.showNetworkModeButton" class="icon-btn" @click="$emit('toggle-network-mode')" :title="networkMode === 'internal' ? '当前：内网模式' : '当前：外网模式'">
        {{ networkMode === 'internal' ? '🏠' : '🌐' }}
      </button>
      <button v-if="uiSettings.showDarkModeButton" class="icon-btn" @click="$emit('toggle-dark-mode')" :title="darkMode ? '切换到亮色模式' : '切换到暗黑模式'">
        {{ darkMode ? '☀️' : '🌙' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ClockDisplay from '../../ClockDisplay.vue'

const props = defineProps({
  uiSettings: { type: Object, required: true },
  searchQuery: { type: String, default: '' },
  viewMode: { type: String, required: true },
  networkMode: { type: String, required: true },
  darkMode: { type: Boolean, required: true },
  healthFeatureOn: { type: Boolean, default: false },
  healthIsChecking: { type: Boolean, default: false },
  healthEnabledItemCount: { type: Number, default: 0 },
  healthAbnormalCount: { type: Number, default: 0 },
  healthEstimateText: { type: String, default: '' }
})

defineEmits([
  'open-settings',
  'add-item',
  'refresh',
  'run-health-check',
  'toggle-view-mode',
  'toggle-network-mode',
  'toggle-dark-mode',
  'update:searchQuery'
])

const healthBadgeTitle = computed(() => {
  if (props.healthIsChecking) return '连通检测进行中...'
  if (props.healthEnabledItemCount === 0) return '尚未启用分类检测，请到系统应用设置 → 连通检测 → 分类检测配置中启用'
  return `点击检测 ${props.healthEnabledItemCount} 个已启用分类下的链接，预计${props.healthEstimateText}完成`
})
</script>
