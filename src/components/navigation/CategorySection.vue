<template>
  <!-- 分类区块：负责单个分类的标题、健康概览、网格/列表链接展示；业务操作通过事件抛回父组件。 -->
  <div class="category-section">
    <div class="category-header" @click="$emit('toggle-category', category.id)">
      <span class="collapse-icon">{{ category.collapsed ? '▶' : '▼' }}</span>
      <span class="category-name">{{ category.displayName || category.name }}</span>
      <span class="category-count">{{ category.items.length }}</span>
      <span
        v-if="healthFeatureOn"
        class="category-health-overview"
        :class="{
          'health-overview-ok': categoryOverview.offline === 0 && categoryOverview.online > 0,
          'health-overview-abnormal': categoryOverview.offline > 0
        }"
        :title="`在线 ${categoryOverview.online} / 异常 ${categoryOverview.offline}`"
      >
        <span v-if="categoryOverview.offline > 0" class="health-dot-small health-offline"></span>
        <span v-else-if="categoryOverview.online > 0" class="health-dot-small health-online"></span>
        <span v-else class="health-dot-small health-unknown"></span>
        <span class="health-overview-text">{{ categoryOverview.online }}/{{ categoryOverview.offline }}</span>
      </span>
      <button
        v-if="healthFeatureOn && categoryEnabledCount > 0"
        class="category-health-check-btn"
        @click.stop="$emit('health-check-category', category)"
        :title="`检测当前分类下 ${categoryEnabledCount} 个已启用分类配置的链接`"
      >🩺</button>
      <button class="category-add-btn" @click.stop="$emit('add-item', category)" title="添加到此分类">➕</button>
    </div>

    <div v-if="!category.collapsed && viewMode === 'grid'" class="items-grid">
      <GridItemCard
        v-for="item in category.items"
        :key="item.id"
        :item="item"
        :menu-active="activeMenu === item.id"
        :is-favorite="isFavoriteItem(item)"
        :health-feature-on="healthFeatureOn"
        :dark-mode="darkMode"
        :health-visible="healthIndicatorVisible(item)"
        :health-enabled="isHealthCheckEnabledFor(item)"
        :health-abnormal="isHealthAbnormalFor(item)"
        :health-status-class="healthStatusClass(item)"
        @click="$emit('grid-click', $event)"
        @dblclick="$emit('item-dblclick', $event)"
        @mouseenter="(item, event) => $emit('mouseenter', item, event)"
        @mouseleave="$emit('mouseleave')"
        @toggle-menu="$emit('toggle-item-menu', $event)"
        @menu-activity="$emit('item-menu-activity')"
        @open="$emit('open-force', $event)"
        @favorite="$emit('favorite', $event)"
        @health-check="$emit('health-check-item', $event)"
        @edit="$emit('edit-item', $event)"
        @delete="$emit('delete-item', $event)"
        @image-error="$emit('image-error', $event)"
      />
    </div>

    <div v-else-if="!category.collapsed" class="items-list">
      <ListItemRow
        v-for="item in category.items"
        :key="item.id"
        :item="item"
        :is-favorite="isFavoriteItem(item)"
        :health-feature-on="healthFeatureOn"
        :health-visible="healthIndicatorVisible(item)"
        :health-status-class="healthStatusClass(item)"
        :health-status-text="healthStatusText(item)"
        :health-latency-text="healthLatencyText(item)"
        :show-latency="showLatency"
        @click="$emit('list-click', $event)"
        @dblclick="$emit('item-dblclick', $event)"
        @favorite="$emit('favorite', $event)"
        @health-check="$emit('health-check-item', $event)"
        @edit="$emit('edit-item', $event)"
        @delete="$emit('delete-item', $event)"
        @image-error="$emit('image-error', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import GridItemCard from './GridItemCard.vue'
import ListItemRow from './ListItemRow.vue'

defineProps({
  category: { type: Object, required: true },
  viewMode: { type: String, required: true },
  activeMenu: { type: [String, Number, null], default: null },
  healthFeatureOn: { type: Boolean, default: false },
  darkMode: { type: Boolean, default: false },
  categoryOverview: { type: Object, required: true },
  categoryEnabledCount: { type: Number, default: 0 },
  showLatency: { type: Boolean, default: false },
  isFavoriteItem: { type: Function, required: true },
  healthIndicatorVisible: { type: Function, required: true },
  isHealthCheckEnabledFor: { type: Function, required: true },
  isHealthAbnormalFor: { type: Function, required: true },
  healthStatusClass: { type: Function, required: true },
  healthStatusText: { type: Function, required: true },
  healthLatencyText: { type: Function, required: true }
})

defineEmits([
  'toggle-category',
  'health-check-category',
  'add-item',
  'grid-click',
  'list-click',
  'item-dblclick',
  'mouseenter',
  'mouseleave',
  'toggle-item-menu',
  'item-menu-activity',
  'open-force',
  'favorite',
  'health-check-item',
  'edit-item',
  'delete-item',
  'image-error'
])
</script>
