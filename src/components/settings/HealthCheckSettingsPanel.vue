<template>
  <div class="settings-card compact-settings-card">
    <div class="settings-section-title">连通检测 · 全局配置</div>
    <div class="settings-section-subtitle">控制服务连通性检测的总开关、触发方式、并发与超时。</div>
    <div class="health-mode-hint" :class="'health-mode-' + healthServiceKind">
      <span v-if="healthServiceKind === 'utools'">🔬 当前探测模式：uTools 原生（HTTP HEAD / TCP 端口，精确区分在线/离线/超时）</span>
      <span v-else-if="healthServiceKind === 'node'">🔬 当前探测模式：Node 原生模块（HTTP HEAD / TCP 端口，精确区分在线/离线/超时）</span>
      <span v-else>🌐 当前探测模式：浏览器尽力探测（受 CORS 限制，仅判断地址可达性，离线判定为尽力而为）</span>
    </div>
    <div class="settings-row"><div><div class="settings-item-title">总开关</div><div class="settings-item-desc">关闭后所有检测 UI 与行为完全隐藏，与未安装该功能一致</div></div><input v-model="healthUiSettings.globalEnabled" type="checkbox" class="toggle-switch-input"></div>
    <div class="settings-row"><div><div class="settings-item-title">启动自动检测</div><div class="settings-item-desc">插件进入时自动全量检测已启用条目</div></div><input v-model="healthUiSettings.autoCheckOnStart" type="checkbox" class="toggle-switch-input"></div>
    <div class="settings-row"><div><div class="settings-item-title">定时轮询</div><div class="settings-item-desc">仅插件可见时运行，后台时暂停</div></div><input v-model="healthUiSettings.pollingEnabled" type="checkbox" class="toggle-switch-input"></div>
    <div class="settings-row" v-if="healthUiSettings.pollingEnabled"><div><div class="settings-item-title">轮询间隔</div><div class="settings-item-desc">自动检测的间隔时间</div></div><select v-model="healthUiSettings.pollingInterval" class="health-select"><option :value="30">30 秒</option><option :value="60">1 分钟</option><option :value="300">5 分钟</option></select></div>
    <div class="settings-row"><div><div class="settings-item-title">默认超时时间</div><div class="settings-item-desc">单次探测最长等待毫秒数</div></div><input v-model.number="healthUiSettings.defaultTimeout" type="number" min="500" max="60000" step="500" class="health-number-input" /></div>
    <div class="settings-row"><div><div class="settings-item-title">最大并发数</div><div class="settings-item-desc">同时进行的探测连接上限，逐批执行</div></div><input v-model.number="healthUiSettings.concurrency" type="number" min="1" max="20" step="1" class="health-number-input" /></div>
    <div class="settings-row"><div><div class="settings-item-title">显示延迟数值</div><div class="settings-item-desc">在状态指示中显示在线响应延迟</div></div><input v-model="healthUiSettings.showLatency" type="checkbox" class="toggle-switch-input"></div>
    <div class="health-action-row">
      <button class="btn btn-primary" @click="$emit('run-health-check-all')" :disabled="healthIsChecking">
        {{ healthIsChecking ? '检测中...' : '🩺 立即全量检测' }}
      </button>
    </div>
  </div>

  <div class="settings-card compact-settings-card">
    <div class="settings-section-title">分类检测配置</div>
    <div class="settings-section-subtitle">以分类为单位启用/停用检测。启用某个分类后，该分类及其子分类下的链接都会参与检测，后续新增链接也会自动继承。</div>
    <div class="form-group">
      <label>选择分类</label>
      <div class="health-category-dropdown" @click.stop @mouseenter="$emit('cancel-dropdown-close')" @mouseleave="$emit('schedule-dropdown-close')">
        <button type="button" class="health-category-dropdown-trigger" @click="$emit('toggle-dropdown')">
          <span class="health-category-trigger-text">{{ selectedCategorySummary }}</span>
          <span class="health-category-trigger-arrow">{{ healthCategoryDropdownOpen ? '▲' : '▼' }}</span>
        </button>
        <div v-if="healthCategoryDropdownOpen" class="health-category-dropdown-panel">
          <div class="health-category-toolbar">
            <span class="health-category-summary">已选择 {{ healthSettingsBatchCategories.length }} 个分类</span>
            <button class="btn btn-cancel health-mini-btn" @click="$emit('select-all-categories')">全选</button>
            <button class="btn btn-cancel health-mini-btn" @click="$emit('clear-categories')">清空</button>
          </div>
          <div class="health-category-select-list">
            <label v-for="cat in orderedRegularCategories" :key="cat.id" class="health-category-select-item" :class="healthCategoryConfigClass(cat)">
              <input
                :checked="healthSettingsBatchCategories.includes(cat.id)"
                type="checkbox"
                :value="cat.id"
                @change="$emit('toggle-category-selection', cat.id, $event.target.checked)"
              />
              <span class="health-category-select-name" :title="formatCategoryPath(cat)">{{ formatCategoryPath(cat) }}</span>
              <span class="health-category-select-count">{{ getHealthCategoryLinkCount(cat.id) }} 个链接</span>
              <span class="health-category-config-badge">{{ healthCategoryConfigLabel(cat) }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
    <div class="health-action-row">
      <button class="btn btn-primary" @click="$emit('run-batch-enable-health')">启用所选分类检测</button>
      <button class="btn btn-cancel" @click="$emit('run-batch-disable-health')">停用所选分类检测</button>
    </div>
    <div class="health-divider"></div>
    <div class="health-action-row">
      <button class="btn btn-cancel" @click="$emit('reset-all-health-check-config')">重置所有分类配置</button>
      <button class="btn btn-cancel" @click="$emit('clear-all-health-check-config')">清除所有分类配置</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  healthUiSettings: { type: Object, required: true },
  healthServiceKind: { type: String, required: true },
  healthIsChecking: { type: Boolean, default: false },
  healthCategoryDropdownOpen: { type: Boolean, default: false },
  selectedCategorySummary: { type: String, required: true },
  healthSettingsBatchCategories: { type: Array, required: true },
  orderedRegularCategories: { type: Array, required: true },
  healthCategoryConfigClass: { type: Function, required: true },
  healthCategoryConfigLabel: { type: Function, required: true },
  formatCategoryPath: { type: Function, required: true },
  getHealthCategoryLinkCount: { type: Function, required: true }
})

defineEmits([
  'run-health-check-all',
  'cancel-dropdown-close',
  'schedule-dropdown-close',
  'toggle-dropdown',
  'select-all-categories',
  'clear-categories',
  'toggle-category-selection',
  'run-batch-disable-health',
  'reset-all-health-check-config',
  'clear-all-health-check-config'
])
</script>
