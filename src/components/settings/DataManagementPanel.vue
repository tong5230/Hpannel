<template>
  <div class="settings-card">
    <div class="settings-section-title">数据管理</div>
    <div class="settings-section-subtitle data-management-intro">系统数据与兼容浏览器书签已分开管理，导入导出时不会混用格式。</div>
    <div class="data-management-groups">
      <div class="data-management-group">
        <div class="data-group-title">系统数据</div>
        <div class="data-group-desc">用于当前导航面板的数据备份、迁移与恢复，不支持浏览器书签格式。</div>
        <div class="settings-actions-grid">
          <button class="settings-action-btn" @click="$emit('refresh-data')">🔄 刷新当前数据</button>
          <button class="settings-action-btn" @click="$emit('import-data')">📥 导入数据</button>
          <button class="settings-action-btn" @click="$emit('open-export-data-dialog')">📦 导出数据</button>
        </div>
      </div>
      <div class="data-management-group">
        <div class="data-group-title">兼容浏览器书签</div>
        <div class="data-group-desc">专门用于市场上浏览器的书签 HTML 格式，和系统数据导入导出完全分开。</div>
        <div class="settings-actions-grid">
          <button class="settings-action-btn" @click="$emit('import-browser-html')">🌐 导入兼容浏览器书签</button>
          <button class="settings-action-btn" @click="$emit('export-browser-bookmarks')">⭐ 导出兼容浏览器书签</button>
        </div>
      </div>
      <div class="data-management-group danger-group">
        <div class="data-group-title">维护操作</div>
        <div class="data-group-desc">用于恢复默认数据或清空当前数据，执行前请先确认是否已经完成备份。</div>
        <div class="settings-actions-grid">
          <button class="settings-action-btn danger" @click="$emit('reset-to-default')">🔄 重置默认数据</button>
          <button class="settings-action-btn danger" @click="$emit('clear-all-data')">🗑️ 清空所有数据</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits([
  'refresh-data',
  'import-data',
  'open-export-data-dialog',
  'import-browser-html',
  'export-browser-bookmarks',
  'reset-to-default',
  'clear-all-data'
])
</script>
