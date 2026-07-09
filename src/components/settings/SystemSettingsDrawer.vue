<template>
  <!-- 系统设置侧栏外壳：负责遮罩、宽度、导航 tab、关闭按钮和内容插槽，不承载具体设置页业务。 -->
  <div v-if="visible" class="management-overlay" @click="$emit('close')">
    <div class="management-sidebar" :style="{ width: sidebarWidth + 'px' }" @click.stop>
      <div class="sidebar-resize-handle" @mousedown.stop="$emit('start-resize', $event)"></div>
      <div class="management-header">
        <div class="header-title">
          <h3>系统应用设置</h3>
          <span class="total-count">{{ activeDescription }}</span>
        </div>
        <div class="header-actions">
          <button class="icon-btn-small" @click="$emit('close')" title="关闭设置">✕</button>
        </div>
      </div>

      <slot name="hidden-inputs"></slot>

      <div class="settings-layout">
        <div class="settings-tabs" :class="{ collapsed: navCollapsed }">
          <button
            v-for="section in sections"
            :key="section.id"
            class="settings-tab-btn"
            :class="{ active: activeSection === section.id, compact: navCollapsed }"
            @click="$emit('switch-section', section.id)"
            :title="section.label"
          >
            <span class="settings-tab-icon">{{ section.icon }}</span>
            <span class="settings-tab-text">{{ section.label }}</span>
          </button>
          <button
            v-if="healthFeatureOn"
            class="settings-tab-btn health-settings-tab"
            :class="{ active: activeSection === 'health-check', compact: navCollapsed }"
            @click="$emit('switch-section', 'health-check')"
            title="连通检测"
          >
            <span class="settings-tab-icon">🩺</span>
            <span class="settings-tab-text">连通检测</span>
          </button>
        </div>

        <button
          type="button"
          class="settings-nav-toggle"
          :class="{ collapsed: navCollapsed }"
          @click="$emit('toggle-nav')"
          :title="navCollapsed ? '展开系统应用设置' : '收起系统应用设置'"
        >
          {{ navCollapsed ? '»' : '«' }}
        </button>

        <div class="management-content">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, required: true },
  sidebarWidth: { type: Number, required: true },
  sections: { type: Array, required: true },
  activeSection: { type: String, required: true },
  navCollapsed: { type: Boolean, default: false },
  sectionMeta: { type: Object, required: true },
  healthFeatureOn: { type: Boolean, default: false }
})

defineEmits(['close', 'start-resize', 'switch-section', 'toggle-nav'])

const activeDescription = computed(() => props.sectionMeta[props.activeSection]?.description || '')
</script>
