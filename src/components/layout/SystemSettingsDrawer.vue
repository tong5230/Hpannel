<template>
  <div v-if="visible" class="management-overlay" @click="$emit('close')">
    <div class="management-sidebar" :class="`drawer-${drawerSide}`" :style="{ width: sidebarWidth + 'px' }" @click.stop>
      <div class="sidebar-resize-handle" @mousedown.stop="$emit('start-resize', $event)"></div>
      <div class="management-header">
        <div class="header-title">
          <h3>系统应用设置</h3>
          <span class="total-count">{{ sectionDescription }}</span>
        </div>
        <div class="header-actions">
          <button class="icon-btn-small" @click="$emit('close')" title="关闭设置">✕</button>
        </div>
      </div>

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
            v-if="showHealthTab"
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
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, required: true },
  sidebarWidth: { type: Number, required: true },
  drawerSide: { type: String, default: 'left' },
  navCollapsed: { type: Boolean, required: true },
  activeSection: { type: String, required: true },
  sectionDescription: { type: String, default: '' },
  sections: { type: Array, required: true },
  showHealthTab: { type: Boolean, default: false }
})

defineEmits(['close', 'start-resize', 'switch-section', 'toggle-nav'])
</script>
