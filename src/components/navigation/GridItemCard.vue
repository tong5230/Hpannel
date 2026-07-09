<template>
  <!-- 网格链接卡片：负责单个链接在网格视图中的展示、菜单入口与事件转发。 -->
  <div
    ref="cardRef"
    class="item-card"
    :class="{
      'menu-active': menuActive,
      'health-card-offline': healthFeatureOn && healthAbnormal
    }"
    @click.stop="$emit('click', item)"
    @dblclick="$emit('dblclick', item)"
    @mouseenter="$emit('mouseenter', item, $event)"
    @mouseleave="$emit('mouseleave')"
  >
    <span
      v-if="healthVisible"
      class="item-card-health-bar"
      :class="healthStatusClass"
    ></span>
    <div class="item-menu-btn" @click.stop="$emit('toggle-menu', item.id)">⋮</div>
    <Teleport to="body">
      <div
        v-if="menuActive"
        ref="menuRef"
        class="item-menu item-menu-floating"
        :class="{ 'dark-mode': darkMode }"
        :style="menuPositionStyle"
        @click.stop
        @pointerenter.stop="$emit('menu-activity')"
        @pointermove.stop="$emit('menu-activity')"
        @focusin.stop="$emit('menu-activity')"
      >
        <div class="menu-item" @click="$emit('open', item)">🔗 打开</div>
        <div class="menu-item favorite-menu-item" @click="$emit('favorite', item)">
          <span class="favorite-menu-heart" :class="{ active: isFavorite }">{{ isFavorite ? '♥' : '♡' }}</span>
          {{ isFavorite ? '已喜欢' : '喜欢' }}
        </div>
        <div class="menu-item health-recheck-menu-item" v-if="healthFeatureOn && healthEnabled" @click="$emit('health-check', item)">🩺 重新检测</div>
        <div class="menu-item" @click="$emit('edit', item)">✏️ 编辑</div>
        <div class="menu-item" @click="$emit('delete', item)">🗑️ 删除</div>
      </div>
    </Teleport>
    <div class="item-icon">
      <img v-if="item.iconUrl" :src="item.iconUrl" :alt="item.name" @error="$emit('image-error', $event)">
      <span v-else>{{ item.icon }}</span>
    </div>
    <div class="item-content">
      <div class="item-name">{{ item.name }}</div>
      <div v-if="item.note" class="item-note">{{ item.note }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  item: { type: Object, required: true },
  menuActive: { type: Boolean, default: false },
  isFavorite: { type: Boolean, default: false },
  healthFeatureOn: { type: Boolean, default: false },
  darkMode: { type: Boolean, default: false },
  healthVisible: { type: Boolean, default: false },
  healthEnabled: { type: Boolean, default: false },
  healthAbnormal: { type: Boolean, default: false },
  healthStatusClass: { type: String, default: 'health-unknown' }
})

defineEmits([
  'click',
  'dblclick',
  'mouseenter',
  'mouseleave',
  'toggle-menu',
  'menu-activity',
  'open',
  'favorite',
  'health-check',
  'edit',
  'delete',
  'image-error'
])

const cardRef = ref(null)
const menuRef = ref(null)
const menuPos = ref({ top: 0, left: 0 })

const menuPositionStyle = computed(() => ({
  position: 'fixed',
  top: menuPos.value.top + 'px',
  left: menuPos.value.left + 'px',
  right: 'auto'
}))

watch(() => props.menuActive, (active, _previous, onCleanup) => {
  if (!active) return

  nextTick(() => {
    computeMenuPosition()
  })

  window.addEventListener('resize', computeMenuPosition)
  window.addEventListener('scroll', computeMenuPosition, true)
  onCleanup(() => {
    window.removeEventListener('resize', computeMenuPosition)
    window.removeEventListener('scroll', computeMenuPosition, true)
  })
})

function computeMenuPosition() {
  if (!cardRef.value) return
  const cardRect = cardRef.value.getBoundingClientRect()
  const menuWidth = menuRef.value?.offsetWidth || 120
  const menuHeight = menuRef.value?.offsetHeight || 200
  const gap = 8
  const padding = 12

  const panelEl = cardRef.value.closest('.navigation-panel')
  const panelRect = panelEl ? panelEl.getBoundingClientRect() : {
    top: 0,
    bottom: window.innerHeight,
    left: 0,
    right: window.innerWidth
  }
  const boundaryRect = {
    top: Math.max(panelRect.top, 0),
    bottom: Math.min(panelRect.bottom, window.innerHeight),
    left: Math.max(panelRect.left, 0),
    right: Math.min(panelRect.right, window.innerWidth)
  }

  let left = 0
  let top = cardRect.top

  // 策略1：优先在卡片右侧显示
  const rightX = cardRect.right + gap
  if (rightX + menuWidth <= boundaryRect.right - padding) {
    left = rightX
  }
  // 策略2：尝试卡片左侧
  else {
    const leftX = cardRect.left - menuWidth - gap
    if (leftX >= boundaryRect.left + padding) {
      left = leftX
    }
    // 策略3：卡片下方居中，不遮挡卡片
    else {
      left = cardRect.left
      top = cardRect.bottom + gap

      // 水平居中对齐
      if (cardRect.width > menuWidth) {
        left = cardRect.left + (cardRect.width - menuWidth) / 2
      }

      // 确保不超出左边界
      if (left < boundaryRect.left + padding) {
        left = boundaryRect.left + padding
      }
      // 确保不超出右边界
      if (left + menuWidth > boundaryRect.right - padding) {
        left = boundaryRect.right - menuWidth - padding
      }
    }
  }

  // 垂直方向调整：确保不超出面板底部
  if (top + menuHeight > boundaryRect.bottom - padding) {
    // 尝试放在卡片上方
    const topY = cardRect.top - menuHeight - gap
    if (topY >= boundaryRect.top + padding) {
      top = topY
    } else {
      // 贴着底部显示
      top = boundaryRect.bottom - menuHeight - padding
    }
  }

  // 确保不超出面板顶部
  if (top < boundaryRect.top + padding) {
    top = boundaryRect.top + padding
  }

  menuPos.value = { top, left }
}
</script>
