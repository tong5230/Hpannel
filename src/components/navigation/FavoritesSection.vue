<template>
  <!-- 喜欢分组：组合喜欢链接的网格标签视图与列表视图，所有增删/打开动作由父组件处理。 -->
  <div class="favorites-section">
    <div class="favorites-header" @click="$emit('toggle-collapsed')">
      <span class="collapse-icon">{{ collapsed ? '▶' : '▼' }}</span>
      <span class="favorites-label">喜欢</span>
      <span class="favorites-count">{{ items.length }}</span>
    </div>

    <div v-if="!collapsed && viewMode === 'grid'" class="favorites-tags">
      <button
        v-for="item in items"
        :key="item.id"
        class="favorite-tag"
        @click="$emit('open', item)"
        @mouseenter="$emit('mouseenter', item, $event)"
        @mouseleave="$emit('mouseleave')"
      >
        <span class="favorite-tag-text">{{ item.name }}</span>
        <span class="favorite-tag-remove favorite-heart-btn is-active" @click.stop="$emit('remove', item)" title="取消喜欢">♥</span>
      </button>
    </div>

    <div v-else-if="!collapsed" class="items-list">
      <ListItemRow
        v-for="item in items"
        :key="item.id"
        :item="item"
        :is-favorite="true"
        :favorite-only="true"
        :health-feature-on="false"
        @click="$emit('list-click', $event)"
        @dblclick="$emit('item-dblclick', $event)"
        @favorite="$emit('remove', $event)"
        @image-error="$emit('image-error', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import ListItemRow from './ListItemRow.vue'

defineProps({
  items: { type: Array, required: true },
  collapsed: { type: Boolean, required: true },
  viewMode: { type: String, required: true }
})

defineEmits([
  'toggle-collapsed',
  'open',
  'remove',
  'mouseenter',
  'mouseleave',
  'list-click',
  'item-dblclick',
  'image-error'
])
</script>
