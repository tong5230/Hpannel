<template>
  <div class="settings-card compact-settings-card">
    <div class="settings-section-title">布局设置</div>
    <div class="settings-section-subtitle">统一配置主页面默认布局、网络、主题与系统设置打开位置，后续扩展可继续放在此处。</div>
    <div class="component-settings-grid layout-settings-grid">
      <div class="toggle-card layout-option-card">
        <div>
          <div class="settings-item-title">显示模式</div>
          <div class="settings-item-desc">切换网格或列表视图</div>
        </div>
        <button class="layout-pill-switch" :class="{ active: viewMode === 'list' }" @click="$emit('toggle-view-mode')">
          <span>网格</span>
          <span>列表</span>
        </button>
      </div>
      <div class="toggle-card layout-option-card">
        <div>
          <div class="settings-item-title">网络模式</div>
          <div class="settings-item-desc">默认打开内网或外网地址</div>
        </div>
        <button class="layout-pill-switch" :class="{ active: networkMode === 'external' }" @click="$emit('toggle-network-mode')">
          <span>内网</span>
          <span>外网</span>
        </button>
      </div>
      <div class="toggle-card layout-option-card">
        <div>
          <div class="settings-item-title">主题模式</div>
          <div class="settings-item-desc">切换亮色与暗黑主题</div>
        </div>
        <button class="layout-pill-switch" :class="{ active: darkMode }" @click="$emit('toggle-dark-mode')">
          <span>亮色</span>
          <span>暗黑</span>
        </button>
      </div>
      <div class="toggle-card layout-option-card">
        <div>
          <div class="settings-item-title">系统应用设置位置</div>
          <div class="settings-item-desc">控制系统应用设置整体从哪侧打开</div>
        </div>
        <button class="layout-pill-switch" :class="{ active: settingsDrawerSide === 'right' }" @click="$emit('toggle-settings-drawer-side')">
          <span>左侧</span>
          <span>右侧</span>
        </button>
      </div>
    </div>
  </div>

  <div class="settings-card compact-settings-card">
    <div class="settings-section-title">主页面组件</div>
    <div class="settings-section-subtitle">控制标题栏与主页面可见组件，关闭后只隐藏入口，不影响已有数据。</div>
    <div class="component-settings-grid">
      <label class="toggle-card"><div><div class="settings-item-title">添加按钮</div><div class="settings-item-desc">控制顶部 ➕ 按钮是否显示</div></div><input v-model="uiSettings.showAddButton" type="checkbox" class="toggle-switch-input"></label>
      <label class="toggle-card"><div><div class="settings-item-title">时钟组件</div><div class="settings-item-desc">控制顶部时间与日期是否显示</div></div><input v-model="uiSettings.showClock" type="checkbox" class="toggle-switch-input"></label>
      <label class="toggle-card" :class="{ disabled: !uiSettings.showClock }"><div><div class="settings-item-title">显示秒</div><div class="settings-item-desc">在时钟中显示秒数</div></div><input v-model="uiSettings.showClockSeconds" type="checkbox" class="toggle-switch-input" :disabled="!uiSettings.showClock"></label>
      <label class="toggle-card"><div><div class="settings-item-title">搜索栏组件</div><div class="settings-item-desc">控制主页面搜索框是否显示</div></div><input v-model="uiSettings.showSearch" type="checkbox" class="toggle-switch-input"></label>
      <label class="toggle-card"><div><div class="settings-item-title">刷新组件</div><div class="settings-item-desc">控制顶部刷新按钮是否显示</div></div><input v-model="uiSettings.showRefreshButton" type="checkbox" class="toggle-switch-input"></label>
      <label class="toggle-card"><div><div class="settings-item-title">视图模式组件</div><div class="settings-item-desc">控制网格/列表切换按钮是否显示</div></div><input v-model="uiSettings.showViewModeButton" type="checkbox" class="toggle-switch-input"></label>
      <label class="toggle-card"><div><div class="settings-item-title">内外网组件</div><div class="settings-item-desc">控制内外网切换按钮是否显示</div></div><input v-model="uiSettings.showNetworkModeButton" type="checkbox" class="toggle-switch-input"></label>
      <label class="toggle-card"><div><div class="settings-item-title">暗黑组件</div><div class="settings-item-desc">控制亮色/暗黑切换按钮是否显示</div></div><input v-model="uiSettings.showDarkModeButton" type="checkbox" class="toggle-switch-input"></label>
      <label class="toggle-card" :class="{ disabled: !healthFeatureOn }"><div><div class="settings-item-title">连通检测组件</div><div class="settings-item-desc">控制顶部连通检测状态徽标是否显示</div></div><input v-model="uiSettings.showHealthBadge" type="checkbox" class="toggle-switch-input" :disabled="!healthFeatureOn"></label>
    </div>
  </div>

  <div class="settings-card compact-settings-card">
    <div class="settings-section-title">网格卡片</div>
    <div class="settings-section-subtitle">配置主页面网格视图下链接卡片的大小与圆角样式，列表视图不受影响。</div>
    <div class="card-style-settings-grid">
      <div class="form-group compact-form-group">
        <label>卡片大小 {{ uiSettings.gridCardSize }}%</label>
        <input v-model.number="uiSettings.gridCardSize" type="range" min="50" max="120" step="5" />
        <div class="settings-item-desc">向右拖动可放大卡片并减少每行数量</div>
      </div>
      <div class="form-group compact-form-group">
        <label>卡片圆角 {{ uiSettings.gridCardRadius }}%</label>
        <input v-model.number="uiSettings.gridCardRadius" type="range" min="0" max="100" step="5" />
        <div class="settings-item-desc">从方形逐步过渡到圆形胶囊风格</div>
      </div>
    </div>
  </div>

  <div class="settings-card compact-settings-card">
    <div class="settings-section-title">背景壁纸</div>
    <div class="settings-section-subtitle">支持上传图片或填写图片网址，预览确认后设置为主页面壁纸。</div>
    <div class="wallpaper-settings">
      <div class="wallpaper-preview" :class="{ empty: !wallpaperPreview }" :style="wallpaperPreviewStyle">
        <div v-if="!wallpaperPreview" class="wallpaper-placeholder">
          <div class="wallpaper-placeholder-icon">🖼️</div>
          <div class="wallpaper-placeholder-text">暂无背景壁纸</div>
        </div>
      </div>
      <div class="wallpaper-actions">
        <div class="form-group">
          <label>壁纸图片网址</label>
          <div class="wallpaper-url-row">
            <input :value="wallpaperUrlInput" type="text" placeholder="例如：https://example.com/wallpaper.jpg" @input="$emit('wallpaper-url-input', $event.target.value)" />
            <button class="icon-btn-small wallpaper-refresh-btn" @click="$emit('refresh-wallpaper-preview')" title="重新获取并预览壁纸">↻</button>
          </div>
        </div>
        <div class="wallpaper-action-row">
          <button class="btn btn-primary" @click="$emit('trigger-wallpaper-file-input')">上传图片</button>
          <button class="btn btn-primary" @click="$emit('apply-wallpaper')" :disabled="!wallpaperPreview">设置为壁纸</button>
          <button class="btn btn-cancel" @click="$emit('download-wallpaper')" :disabled="!hasWallpaper">下载当前壁纸</button>
          <button class="btn btn-cancel" @click="$emit('clear-wallpaper')" :disabled="!hasWallpaper && !wallpaperUrlInput">清除壁纸</button>
        </div>
        <div v-if="hasLastUploadedWallpaper" class="last-uploaded-wallpaper-card" @click="$emit('use-last-uploaded-wallpaper')">
          <div class="last-uploaded-wallpaper-preview" :style="{ backgroundImage: `url(${lastUploadedWallpaper})` }"></div>
          <div class="last-uploaded-wallpaper-meta">
            <div class="last-uploaded-wallpaper-title">最后一次上传图片</div>
            <div class="last-uploaded-wallpaper-desc">点击载入预览，再点击“设置为壁纸”应用</div>
          </div>
        </div>
        <div class="wallpaper-control-grid">
          <div class="form-group compact-form-group">
            <label>壁纸透明度 {{ Math.round(uiSettings.wallpaperOpacity * 100) }}%</label>
            <input v-model="uiSettings.wallpaperOpacity" type="range" min="0" max="0.65" step="0.01" />
          </div>
          <div class="form-group compact-form-group">
            <label>壁纸模糊 {{ uiSettings.wallpaperBlur }}px</label>
            <input v-model="uiSettings.wallpaperBlur" type="range" min="0" max="12" step="1" />
          </div>
        </div>
        <div class="wallpaper-hint">支持 JPG、PNG、WEBP、GIF 等常见图片格式。本地上传会自动按窗口尺寸压缩，减少卡顿和崩溃风险。</div>
        <input ref="wallpaperFileInputRef" type="file" accept="image/*" style="display: none" @change="$emit('wallpaper-file-select', $event)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, useTemplateRef } from 'vue'

const props = defineProps({
  uiSettings: { type: Object, required: true },
  settingsDrawerSide: { type: String, default: 'left' },
  viewMode: { type: String, required: true },
  networkMode: { type: String, required: true },
  darkMode: { type: Boolean, required: true },
  healthFeatureOn: { type: Boolean, default: false },
  wallpaperUrlInput: { type: String, default: '' },
  wallpaperPreview: { type: String, default: '' },
  wallpaperPreviewStyle: { type: Object, default: () => ({}) },
  hasWallpaper: { type: Boolean, default: false },
  hasLastUploadedWallpaper: { type: Boolean, default: false },
  lastUploadedWallpaper: { type: String, default: '' }
})

const emit = defineEmits([
  'toggle-view-mode',
  'toggle-network-mode',
  'toggle-dark-mode',
  'toggle-settings-drawer-side',
  'wallpaper-url-input',
  'refresh-wallpaper-preview',
  'trigger-wallpaper-file-input',
  'apply-wallpaper',
  'download-wallpaper',
  'clear-wallpaper',
  'use-last-uploaded-wallpaper',
  'wallpaper-file-select'
])

const wallpaperFileInputRef = useTemplateRef('wallpaperFileInputRef')

const triggerWallpaperFileInput = () => {
  wallpaperFileInputRef.value?.click()
}

defineExpose({ triggerWallpaperFileInput })
</script>
