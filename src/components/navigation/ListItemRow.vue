<template>
  <!-- 列表链接行：复用在普通分类列表和喜欢分组列表，favoriteOnly 用于保持喜欢列表的简化操作区。 -->
  <div
    class="list-item"
    @click="$emit('click', item)"
    @dblclick="$emit('dblclick', item)"
  >
    <div class="list-item-icon">
      <img v-if="item.iconUrl" :src="item.iconUrl" :alt="item.name" @error="$emit('image-error', $event)">
      <span v-else>{{ item.icon }}</span>
    </div>
    <div class="list-item-info">
      <div class="list-item-name">{{ item.name }}</div>
      <div v-if="item.note" class="list-item-note">{{ item.note }}</div>
      <div class="list-item-urls">
        <span v-if="item.internalUrl" class="url-tag internal">内网: {{ item.internalUrl }}</span>
        <span v-if="item.externalUrl" class="url-tag external">外网: {{ item.externalUrl }}</span>
        <span v-if="healthVisible" class="url-tag health-status-tag" :class="healthStatusClass">
          <span class="health-dot" :class="healthStatusClass"></span>
          <span class="health-status-text">{{ healthStatusText }}</span>
          <span v-if="showLatency && healthLatencyText" class="health-latency-text">{{ healthLatencyText }}</span>
        </span>
      </div>
    </div>
    <div class="list-item-actions">
      <button
        class="action-btn favorite-heart-action"
        :class="{ 'is-active': isFavorite }"
        @click.stop="$emit('favorite', item)"
        :title="isFavorite ? '取消喜欢' : '添加到喜欢'"
      >
        {{ isFavorite ? '♥' : '♡' }}
      </button>
      <button v-if="healthFeatureOn && !favoriteOnly" class="action-btn" @click.stop="$emit('health-check', item)" title="重新检测连通性">🩺</button>
      <button v-if="!favoriteOnly" class="action-btn" @click.stop="$emit('edit', item)" title="编辑">✏️</button>
      <button v-if="!favoriteOnly" class="action-btn" @click.stop="$emit('delete', item)" title="删除">🗑️</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  item: { type: Object, required: true },
  isFavorite: { type: Boolean, default: false },
  healthFeatureOn: { type: Boolean, default: false },
  healthVisible: { type: Boolean, default: false },
  healthStatusClass: { type: String, default: 'health-unknown' },
  healthStatusText: { type: String, default: '未检测' },
  healthLatencyText: { type: String, default: '' },
  showLatency: { type: Boolean, default: false },
  favoriteOnly: { type: Boolean, default: false }
})

defineEmits([
  'click',
  'dblclick',
  'favorite',
  'health-check',
  'edit',
  'delete',
  'image-error'
])
</script>
