<template>
  <div
    class="navigation-panel"
    :class="{ 'dark-mode': darkMode, 'wallpaper-active': hasWallpaper, 'health-only-abnormal': healthFeatureOn && healthOnlyAbnormalFilter }"
    :style="navigationPanelStyle"
  >
    <AppHeader
      v-model:search-query="searchQuery"
      :ui-settings="uiSettings"
      :view-mode="viewMode"
      :network-mode="networkMode"
      :dark-mode="darkMode"
      :health-feature-on="healthFeatureOn"
      :health-is-checking="healthIsChecking"
      :health-enabled-item-count="healthEnabledItemCount"
      :health-abnormal-count="healthAbnormalCount"
      :health-estimate-text="formatHealthCheckEstimate(healthEnabledItemCount)"
      @open-settings="openSystemSettings"
      @add-item="showAddDialog(null)"
      @refresh="refreshData"
      @run-health-check="runHealthCheckAll"
      @toggle-view-mode="toggleViewMode"
      @toggle-network-mode="toggleNetworkMode"
      @toggle-dark-mode="toggleDarkMode"
    />

    <FunctionBar
      :all-collapsed="allCollapsed"
      :health-feature-on="healthFeatureOn"
      :health-only-abnormal-filter="healthOnlyAbnormalFilter"
      :health-abnormal-count="healthAbnormalCount"
      @toggle-all-categories="toggleAllCategories"
      @toggle-health-abnormal-filter="toggleHealthAbnormalFilter"
    />

    <!-- 主内容区 -->
    <div class="content">

      <!-- 【新增功能8】仅看异常聚合区 -->
      <div
        v-if="healthFeatureOn && healthOnlyAbnormalFilter"
        class="health-abnormal-section"
      >
        <div class="health-abnormal-header">
          <span class="collapse-icon">▶</span>
          <span class="health-abnormal-title">⚠ 仅看异常</span>
          <span class="health-abnormal-count">{{ healthAbnormalItems.length }}</span>
        </div>
        <div v-if="healthAbnormalItems.length > 0" class="health-abnormal-list">
          <div
            v-for="entry in healthAbnormalItems"
            :key="entry.item.id"
            class="health-abnormal-item"
            :class="healthStatusClassName(entry.status.status, entry.status)"
            @click="openItem(entry.item, { force: true })"
            @mouseenter="showUrlTooltip(entry.item, $event)"
            @mouseleave="hideUrlTooltip"
          >
            <span class="health-dot" :class="healthStatusClassName(entry.status.status, entry.status)"></span>
            <span class="health-abnormal-item-name">{{ entry.item.name }}</span>
            <span v-if="entry.path" class="health-abnormal-item-path">{{ entry.path }}</span>
            <span class="health-abnormal-item-status">{{ healthStatusText(entry.item) }}</span>
          </div>
        </div>
        <div v-else class="health-abnormal-empty">没有异常条目，全部在线 🎉</div>
      </div>

      <FavoritesSection
        v-if="displayedFavoriteItems.length > 0"
        :items="displayedFavoriteItems"
        :collapsed="favoritesCollapsed"
        :view-mode="viewMode"
        @toggle-collapsed="toggleFavoritesCollapsed"
        @open="openItem"
        @remove="removeFromFavorites"
        @mouseenter="showUrlTooltip"
        @mouseleave="hideUrlTooltip"
        @list-click="handleListItemClick"
        @item-dblclick="handleItemDoubleClick"
        @image-error="handleImageError"
      />

      <CategorySection
        v-for="category in filteredCategories"
        :key="category.id"
        :category="category"
        :view-mode="viewMode"
        :active-menu="activeMenu"
        :health-feature-on="healthFeatureOn"
        :dark-mode="darkMode"
        :category-overview="healthCategoryOverview(category)"
        :category-enabled-count="healthCategoryEnabledCount(category)"
        :show-latency="healthUiSettings.showLatency"
        :is-favorite-item="isFavoriteItem"
        :health-indicator-visible="healthIndicatorVisible"
        :is-health-check-enabled-for="isHealthCheckEnabledFor"
        :is-health-abnormal-for="isHealthAbnormalFor"
        :health-status-class="healthStatusClass"
        :health-status-text="healthStatusText"
        :health-latency-text="healthLatencyText"
        @toggle-category="toggleCategory"
        @health-check-category="runHealthCheckForCategory"
        @add-item="showAddDialog"
        @grid-click="handleGridItemClick"
        @list-click="handleListItemClick"
        @item-dblclick="handleItemDoubleClick"
        @mouseenter="showUrlTooltip"
        @mouseleave="hideUrlTooltip"
        @toggle-item-menu="toggleItemMenu"
        @item-menu-activity="scheduleActiveMenuAutoClose"
        @open-force="openItem($event, { force: true })"
        @favorite="toggleFavorite"
        @health-check-item="runHealthCheckForItem"
        @edit-item="editItem"
        @delete-item="deleteItem"
        @image-error="handleImageError"
      />

      <EmptyState v-if="filteredCategories.length === 0 && displayedFavoriteItems.length === 0" />
    </div>

    <!-- 系统应用设置侧边栏 -->
    <SystemSettingsDrawer
      :visible="settingsDialog.visible"
      :sidebar-width="sidebarWidth"
      :drawer-side="settingsDrawerSide"
      :nav-collapsed="settingsDialog.navCollapsed"
      :active-section="settingsDialog.activeSection"
      :section-description="settingsSectionMeta[settingsDialog.activeSection]?.description"
      :sections="settingsSections"
      :show-health-tab="healthFeatureOn"
      @close="closeSystemSettings"
      @start-resize="startSidebarResize"
      @switch-section="switchSettingsSection"
      @toggle-nav="toggleSettingsNav"
    >
        <input ref="fileInput" type="file" accept=".json,.csv,.xlsx,.xls,.html" style="display: none" @change="handleFileImport" />
            <template v-if="settingsDialog.activeSection === 'category-management'">
            <div class="settings-section-header">
              <div>
                <div class="settings-section-title">分类管理</div>
                <div class="settings-section-subtitle">共 {{ totalItemsCount }} 个网址，支持层级分类管理</div>
              </div>
              <div class="settings-section-actions">
                <button class="icon-btn-small" @click="showResetMenu" title="重置数据">🗑️</button>
                <button class="icon-btn-small import-export-btn" @click="showImportExportMenu" title="导入/导出">↕️</button>
                <button class="icon-btn-small" @click="addNewCategory" title="添加分类">➕</button>
              </div>
            </div>

            <div class="manage-search-row">
              <input
                v-model="manageSearchQuery"
                type="text"
                placeholder="搜索分类名称、网址名称、备注或地址..."
                class="manage-search-input"
              />
            </div>

            <div
              v-if="resetMenuVisible"
              class="export-menu"
              @click.stop
              @mouseenter="handleMenuMouseEnter('reset')"
              @mouseleave="handleMenuMouseLeave('reset')"
            >
              <div class="export-menu-item" @click="resetToDefault">🔄 重置为默认数据</div>
              <div class="export-menu-item danger-item" @click="clearAllData">🗑️ 清空所有数据</div>
              <div class="export-menu-item" @click="resetMenuVisible = false">❌ 取消</div>
            </div>

            <div
              v-if="importExportMenuVisible"
              class="export-menu"
              @click.stop
              @mouseenter="handleMenuMouseEnter('importExport')"
              @mouseleave="handleMenuMouseLeave('importExport')"
            >
              <div class="export-menu-group-label">系统数据</div>
              <div class="export-menu-item" @click="importData">📥 导入数据</div>
              <div class="export-menu-item" @click="openExportDataDialog">📦 导出数据</div>
              <div class="export-menu-divider"></div>
              <div class="export-menu-group-label">兼容浏览器书签</div>
              <div class="export-menu-item" @click="importBrowserHtml">🌐 导入兼容浏览器书签</div>
              <div class="export-menu-item" @click="exportData('browser-bookmarks')">⭐ 导出兼容浏览器书签</div>
              <div class="export-menu-item" @click="importExportMenuVisible = false">❌ 取消</div>
            </div>

            <div class="function-bar manage-function-bar">
              <button class="function-btn" @click="toggleAllCategories" :title="allCollapsed ? '展开全部分类' : '折叠全部分类'">
                <span class="collapse-icon">{{ allCollapsed ? '▶' : '▼' }}</span>
                <span class="function-text">全部分类</span>
              </button>
            </div>

            <div v-for="(cat, catIndex) in filteredManageCategories" :key="cat.id" class="manage-category-block">
              <div class="manage-category-header">
                <span class="collapse-icon" @click="toggleCategory(cat.id)">{{ cat.collapsed ? '▶' : '▼' }}</span>
                <div class="category-name-display" :style="{ paddingLeft: `${getCategoryDepth(cat) * 18}px` }">{{ formatCategoryPath(cat) }}</div>
                <span class="item-count-badge">{{ cat.items.length }}</span>
                <button class="menu-icon-btn" @click.stop="toggleCategoryMenu(cat.id)">⋮</button>
                
                <div v-if="activeCategoryMenu === cat.id" class="category-dropdown-menu">
                  <div class="dropdown-item" @click="addNewCategory(cat)">
                    <span>📂</span> 添加子分类
                  </div>
                  <div class="dropdown-item" @click="editCategoryName(cat)">
                    <span>✏️</span> 编辑
                  </div>
                  <div class="dropdown-item" @click="moveCategoryUp(catIndex)">
                    <span>↑</span> 上移
                  </div>
                  <div class="dropdown-item" @click="moveCategoryDown(catIndex)">
                    <span>↓</span> 下移
                  </div>
                  <div class="dropdown-item danger" @click="deleteCategory(cat)">
                    <span>🗑️</span> 删除
                  </div>
                </div>
              </div>
              
              <div v-show="!cat.collapsed" class="manage-items-list">
                <div
                  v-for="item in cat.items"
                  :key="item.id"
                  class="manage-item"
                  :class="{ 'menu-open': activeItemMenuInManage === item.id }"
                  @click="handleManageItemClick(item)"
                  @dblclick="handleItemDoubleClick(item)"
                  @mouseenter="handleManageItemMouseEnter(item, $event)"
                  @mouseleave="handleManageItemMouseLeave"
                >
                  <div class="manage-item-icon">
                    <img v-if="item.iconUrl" :src="item.iconUrl" :alt="item.name" @error="handleImageError">
                    <span v-else>{{ item.icon }}</span>
                  </div>
                  <div class="manage-item-name">{{ item.name }}</div>
                  <button class="menu-icon-btn" @click.stop="toggleItemMenuInManage(item.id)">⋮</button>
                  
                  <div v-if="activeItemMenuInManage === item.id" class="item-dropdown-menu">
                    <div class="dropdown-item" @click="openItem(item, { force: true })">
                      <span>🔗</span> 打开
                    </div>
                    <div
                      class="dropdown-item"
                      :class="isFavoriteItem(item) ? 'favorite-remove-dropdown' : 'favorite-add-dropdown'"
                      @click="toggleFavorite(item)"
                    >
                      <span>{{ isFavoriteItem(item) ? '♥' : '♡' }}</span>
                      {{ isFavoriteItem(item) ? '取消喜欢' : '添加喜欢' }}
                    </div>
                    <div class="dropdown-item" @click="editItem(item)">
                      <span>✏️</span> 编辑
                    </div>
                    <div class="dropdown-item danger" @click="deleteItem(item)">
                      <span>🗑️</span> 删除
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </template>

            <PersonalizationPanel
              v-else-if="settingsDialog.activeSection === 'personalization'"
              ref="personalizationPanelRef"
              :ui-settings="uiSettings"
              :settings-drawer-side="settingsDrawerSide"
              :view-mode="viewMode"
              :network-mode="networkMode"
              :dark-mode="darkMode"
              :health-feature-on="healthFeatureOn"
              :wallpaper-url-input="wallpaperUrlInput"
              :wallpaper-preview="wallpaperPreview"
              :wallpaper-preview-style="wallpaperPreviewStyle"
              :has-wallpaper="hasWallpaper"
              :has-last-uploaded-wallpaper="hasLastUploadedWallpaper"
              :last-uploaded-wallpaper="lastUploadedWallpaper"
              @toggle-view-mode="toggleViewMode"
              @toggle-network-mode="toggleNetworkMode"
              @toggle-dark-mode="toggleDarkMode"
              @toggle-settings-drawer-side="toggleSettingsDrawerSide"
              @wallpaper-url-input="handleWallpaperUrlInput"
              @refresh-wallpaper-preview="refreshWallpaperPreview"
              @trigger-wallpaper-file-input="triggerWallpaperFileInput"
              @apply-wallpaper="applyWallpaper"
              @download-wallpaper="downloadCurrentWallpaper"
              @clear-wallpaper="clearWallpaper"
              @use-last-uploaded-wallpaper="useLastUploadedWallpaper"
              @wallpaper-file-select="handleWallpaperFileSelect"
            />

            <DataManagementPanel
              v-else-if="settingsDialog.activeSection === 'data-management'"
              @refresh-data="refreshData"
              @import-data="importData"
              @open-export-data-dialog="openExportDataDialog"
              @import-browser-html="importBrowserHtml"
              @export-browser-bookmarks="exportData('browser-bookmarks')"
              @reset-to-default="resetToDefault"
              @clear-all-data="clearAllData"
            />

            <AboutPanel v-else-if="settingsDialog.activeSection === 'about'" :about-content-html="aboutContentHtml" />

            <HealthCheckSettingsPanel
              v-else-if="settingsDialog.activeSection === 'health-check'"
              :health-ui-settings="healthUiSettings"
              :health-service-kind="healthServiceKind"
              :health-is-checking="healthIsChecking"
              :health-category-dropdown-open="healthCategoryDropdownOpen"
              :selected-category-summary="healthSelectedCategorySummary"
              :health-settings-batch-categories="healthSettingsBatchCategories"
              :ordered-regular-categories="orderedRegularCategories"
              :health-category-config-class="healthCategoryConfigClass"
              :health-category-config-label="healthCategoryConfigLabel"
              :format-category-path="formatCategoryPath"
              :get-health-category-link-count="getHealthCategoryLinkCount"
              @run-health-check-all="runHealthCheckAll"
              @cancel-dropdown-close="cancelHealthCategoryDropdownClose"
              @schedule-dropdown-close="scheduleHealthCategoryDropdownClose"
              @toggle-dropdown="toggleHealthCategoryDropdown"
              @select-all-categories="selectAllHealthBatchCategories"
              @clear-categories="clearHealthBatchCategories"
              @toggle-category-selection="toggleHealthBatchCategorySelection"
              @run-batch-enable-health="runBatchEnableHealth"
              @run-batch-disable-health="runBatchDisableHealth"
              @reset-all-health-check-config="resetAllHealthCheckConfig"
              @clear-all-health-check-config="clearAllHealthCheckConfig"
            />
    </SystemSettingsDrawer>

    <!-- 添加/编辑对话框 -->
    <div v-if="dialog.visible" class="dialog-overlay" @click="closeDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>{{ dialog.mode === 'add' ? '添加网址' : '编辑网址' }}</h3>
          <button class="close-btn" @click="closeDialog">✕</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>名称 *</label>
            <input v-model="dialog.form.name" type="text" placeholder="例如：百度" />
          </div>
          <div class="form-group">
            <label>分类 *</label>
            <select v-model="dialog.form.categoryId">
              <option v-for="cat in selectableCategories" :key="cat.id" :value="cat.id">{{ formatCategoryPath(cat) }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>内网地址</label>
            <input v-model="dialog.form.internalUrl" type="text" placeholder="例如：http://192.168.1.100:8080" />
          </div>
          <div class="form-group">
            <label>外网地址</label>
            <input v-model="dialog.form.externalUrl" type="text" placeholder="例如：https://www.example.com" />
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="dialog.form.note" rows="3" placeholder="例如：用于查看服务状态、管理后台入口、网站内容简介"></textarea>
          </div>
          <div class="form-group">
            <label>图标 URL</label>
            <input v-model="dialog.form.iconUrl" type="text" placeholder="例如：https://www.example.com/favicon.ico" />
          </div>
          <div class="form-group">
            <label>图标 Emoji（备用）</label>
            <input v-model="dialog.form.icon" type="text" placeholder="例如：🌐" maxlength="2" />
          </div>

          <!-- 【新增功能8】连通检测配置折叠区 -->
          <div v-if="false" class="form-group health-edit-section">
            <div class="health-edit-header" @click="healthEditCollapsed = !healthEditCollapsed">
              <span class="collapse-icon">{{ healthEditCollapsed ? '▶' : '▼' }}</span>
              <span class="health-edit-title">🩺 连通检测配置</span>
            </div>
            <div v-show="!healthEditCollapsed" class="health-edit-body">
              <label class="toggle-card health-edit-toggle">
                <div>
                  <div class="settings-item-title">启用检测</div>
                  <div class="settings-item-desc">为该条目开启服务连通性检测</div>
                </div>
                <input
                  v-model="healthEditConfig.enabled"
                  type="checkbox"
                  class="toggle-switch-input"
                  @change="markHealthEditTouched"
                >
              </label>
              <div class="form-group">
                <label>检测策略</label>
                <select v-model="healthEditConfig.strategy" @change="markHealthEditTouched">
                  <option value="auto">auto（按协议自动判断）</option>
                  <option value="http">http（HTTP HEAD 探测）</option>
                  <option value="tcp">tcp（TCP 端口连接探测）</option>
                </select>
              </div>
              <div class="form-group">
                <label>检测地址</label>
                <select v-model="healthEditConfig.checkTarget" @change="markHealthEditTouched">
                  <option value="follow">follow（跟随当前内/外网模式）</option>
                  <option value="intranet">intranet（仅检测内网地址）</option>
                  <option value="extranet">extranet（仅检测外网地址）</option>
                  <option value="both">both（同时检测两者）</option>
                </select>
              </div>
              <div class="form-group">
                <label>超时时间</label>
                <div class="health-edit-timeout-row">
                  <label class="radio-option health-edit-radio">
                    <input type="radio" v-model="healthEditConfig.timeoutMode" value="inherit" @change="markHealthEditTouched">
                    <span class="radio-label">继承全局 ({{ healthUiSettings.defaultTimeout }}ms)</span>
                  </label>
                  <label class="radio-option health-edit-radio">
                    <input type="radio" v-model="healthEditConfig.timeoutMode" value="custom" @change="markHealthEditTouched">
                    <span class="radio-label">自定义</span>
                    <input
                      v-model.number="healthEditConfig.timeout"
                      type="number"
                      min="500"
                      max="60000"
                      step="500"
                      class="health-edit-timeout-input"
                      :disabled="healthEditConfig.timeoutMode !== 'custom'"
                      @input="markHealthEditTouched"
                    />
                    <span class="radio-description">毫秒</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-cancel" @click="closeDialog">取消</button>
          <button class="btn btn-primary" @click="saveItem">保存</button>
        </div>
      </div>
    </div>

    <!-- 添加分类对话框 -->
    <div v-if="categoryFormDialog.visible" class="dialog-overlay" @click="closeCategoryFormDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>{{ categoryFormDialog.mode === 'add' ? '添加分类' : '编辑分类' }}</h3>
          <button class="close-btn" @click="closeCategoryFormDialog">✕</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>分类名称 *</label>
            <input
              v-model="categoryFormDialog.form.name"
              type="text"
              placeholder="例如：开发工具"
              @keyup.enter="saveCategoryForm"
              ref="categoryNameInput"
            />
          </div>
          <div class="form-group">
            <label>分类图标（可选）</label>
            <input
              v-model="categoryFormDialog.form.icon"
              type="text"
              placeholder="例如：🛠️"
              maxlength="2"
            />
          </div>
          <div class="form-group">
            <label>上级分类</label>
            <select v-model="categoryFormDialog.form.parentId">
              <option :value="null">无（顶级分类）</option>
              <option v-for="cat in categoryFormParentOptions" :key="cat.id" :value="cat.id">{{ formatCategoryPath(cat) }}</option>
            </select>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-cancel" @click="closeCategoryFormDialog">取消</button>
          <button class="btn btn-primary" @click="saveCategoryForm">保存</button>
        </div>
      </div>
    </div>

    <!-- 浏览器HTML导入对话框 -->
    <div v-if="browserImportDialog.visible" class="dialog-overlay" @click="closeBrowserImportDialog">
      <div class="dialog" style="max-width: 600px;" @click.stop>
        <div class="dialog-header">
          <h3>导入兼容浏览器书签</h3>
          <button class="close-btn" @click="closeBrowserImportDialog">✕</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>选择HTML文件</label>
            <div class="file-upload-area" @click="triggerBrowserFileInput" @dragover.prevent @drop="handleBrowserFileDrop">
              <div v-if="!browserImportDialog.fileName" class="file-upload-placeholder">
                <div class="upload-icon">📂</div>
                <div class="upload-text">点击选择文件，或拖拽文件到此处</div>
                <div class="upload-hint">支持所有浏览器导出的HTML书签/收藏夹文件</div>
              </div>
              <div v-else class="file-upload-selected">
                <div class="file-info">
                  <div class="file-icon">📄</div>
                  <div class="file-details">
                    <div class="file-name">{{ browserImportDialog.fileName }}</div>
                    <div class="file-size">{{ formatFileSize(browserImportDialog.fileSize) }}</div>
                  </div>
                </div>
                <button class="btn btn-cancel" @click.stop="clearBrowserFile">重新选择</button>
              </div>
            </div>
            <input ref="browserFileInput" type="file" accept=".html,.htm" style="display: none" @change="handleBrowserFileSelect" />
          </div>
          
          <div class="form-group">
            <label>导入模式选择</label>
            <div class="import-mode-options">
              <label class="radio-option">
                <input type="radio" v-model="browserImportDialog.mode" value="internal">
                <span class="radio-label">设置为内网地址</span>
                <span class="radio-description">导入的地址将作为内网地址，外网地址保持不变</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="browserImportDialog.mode" value="external">
                <span class="radio-label">设置为外网地址</span>
                <span class="radio-description">导入的地址将作为外网地址，内网地址保持不变</span>
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label>默认分类</label>
            <select v-model="browserImportDialog.defaultCategory">
              <option value="">自动创建分类（从HTML文件中读取）</option>
              <option v-for="cat in orderedRegularCategories" :key="cat.id" :value="cat.id">{{ formatCategoryPath(cat) }}</option>
              <option value="new">新建分类...</option>
            </select>
            <input v-if="browserImportDialog.defaultCategory === 'new'" v-model="browserImportDialog.newCategoryName" type="text" placeholder="输入新分类名称" class="new-category-input" />
          </div>
          
          <div v-if="browserImportDialog.parseResult" class="import-preview">
            <div class="preview-header">导入预览</div>
            <div class="preview-info">
              <div class="preview-stat">找到 {{ browserImportDialog.parseResult.bookmarks.length }} 个书签</div>
              <div class="preview-stat">{{ browserImportDialog.parseResult.folders.length }} 个文件夹/分类</div>
              <div class="preview-stat">{{ browserImportDialog.parseResult.duplicates }} 个重复书签（将更新）</div>
              <div class="preview-stat">{{ browserImportDialog.parseResult.newItems }} 个新书签（将新增）</div>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-cancel" @click="closeBrowserImportDialog">取消</button>
          <button 
            class="btn btn-primary" 
            @click="processBrowserImport" 
            :disabled="!browserImportDialog.fileName || !browserImportDialog.mode || browserImportDialog.processing"
          >
            {{ browserImportDialog.processing ? '处理中...' : '开始导入' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="exportDataDialog.visible" class="dialog-overlay" @click="closeExportDataDialog">
      <div class="dialog export-data-dialog" @click.stop>
        <div class="dialog-header">
          <h3>导出数据</h3>
          <button class="close-btn" @click="closeExportDataDialog">✕</button>
        </div>
        <div class="dialog-body">
          <div class="export-dialog-note">仅导出当前系统数据，不包含兼容浏览器书签格式。</div>
          <div class="export-format-grid">
            <button class="export-format-card" @click="confirmExportData('json')">
              <span class="export-format-icon">📄</span>
              <span class="export-format-title">JSON</span>
              <span class="export-format-desc">导出系统完整分类结构，适合备份与恢复</span>
            </button>
            <button class="export-format-card" @click="confirmExportData('excel')">
              <span class="export-format-icon">📊</span>
              <span class="export-format-title">Excel</span>
              <span class="export-format-desc">导出系统条目清单，适合表格查看与整理</span>
            </button>
            <button class="export-format-card" @click="confirmExportData('html')">
              <span class="export-format-icon">🌐</span>
              <span class="export-format-title">HTML</span>
              <span class="export-format-desc">导出系统数据网页视图，适合浏览和展示</span>
            </button>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-cancel" @click="closeExportDataDialog">取消</button>
        </div>
      </div>
    </div>

    <!-- URL 提示框 -->
    <div
      v-if="urlTooltip.visible"
      class="url-tooltip"
      :class="{ 'tooltip-bottom': urlTooltip.placement === 'bottom' }"
      :style="{ left: urlTooltip.x + 'px', top: urlTooltip.y + 'px' }"
    >
      <div class="tooltip-mode">{{ urlTooltip.mode }}</div>
      <div class="tooltip-section">
        <div class="tooltip-label">内网地址</div>
        <div class="tooltip-url">{{ urlTooltip.internalUrl }}</div>
      </div>
      <div class="tooltip-section">
        <div class="tooltip-label">外网地址</div>
        <div class="tooltip-url">{{ urlTooltip.externalUrl }}</div>
      </div>
      <div v-if="urlTooltip.note" class="tooltip-section">
        <div class="tooltip-label">备注</div>
        <div class="tooltip-note">{{ urlTooltip.note }}</div>
      </div>
      <!-- 【新增功能8】Tooltip 健康状态区块 -->
      <template v-if="healthTooltipSummary">
        <div class="tooltip-divider"></div>
        <div class="tooltip-section health-tooltip-block">
          <div class="tooltip-label">连通检测</div>
          <div
            v-if="healthTooltipSummary.status"
            class="health-tooltip-status"
            :class="healthStatusClassName(healthTooltipSummary.status.status, healthTooltipSummary.status)"
          >
            <span class="health-dot" :class="healthStatusClassName(healthTooltipSummary.status.status, healthTooltipSummary.status)"></span>
            <span>{{ formatHealthStatusLabel(healthTooltipSummary.status.status, healthTooltipSummary.status) }}</span>
            <span v-if="healthUiSettings.showLatency && healthTooltipSummary.status.status === 'online' && healthTooltipSummary.status.latency != null" class="health-latency-text">{{ healthTooltipSummary.status.latency }}ms</span>
          </div>
          <div v-else class="health-tooltip-status">未检测</div>
          <div class="health-tooltip-row">
            <span class="health-tooltip-field-label">最后检测</span>
            <span class="health-tooltip-field-value">{{ healthTooltipSummary.status ? formatHealthTime(healthTooltipSummary.status.lastChecked) : '—' }}</span>
          </div>
          <div v-if="healthTooltipSummary.history.length > 0" class="health-tooltip-history">
            <span class="health-tooltip-field-label">最近 {{ healthTooltipSummary.history.length }} 次</span>
            <span class="health-history-blocks">
              <span
                v-for="(h, idx) in healthTooltipSummary.history"
                :key="idx"
                class="health-history-block"
                :class="healthStatusClassName(h.status, { status: h.status, lastChecked: h.ts })"
                :title="formatHealthTime(h.ts) + ' · ' + formatHealthStatusLabel(h.status, { status: h.status, lastChecked: h.ts })"
              ></span>
            </span>
          </div>
        </div>
      </template>
    </div>

    <div v-if="toast.visible" class="page-toast" :class="`toast-${toast.type}`">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import defaultData from './default-data.json'
import AppHeader from './components/layout/AppHeader.vue'
import FunctionBar from './components/layout/FunctionBar.vue'
import FavoritesSection from './components/navigation/FavoritesSection.vue'
import CategorySection from './components/navigation/CategorySection.vue'
import EmptyState from './components/navigation/EmptyState.vue'
import SystemSettingsDrawer from './components/layout/SystemSettingsDrawer.vue'
import PersonalizationPanel from './components/settings/PersonalizationPanel.vue'
import DataManagementPanel from './components/settings/DataManagementPanel.vue'
import AboutPanel from './components/settings/AboutPanel.vue'
import HealthCheckSettingsPanel from './components/settings/HealthCheckSettingsPanel.vue'

// 关于模板：运行时从 public/about-template.html 加载（构建后 dist/ 下的同名文件可直接编辑，无需二次build）
const aboutTemplateContent = ref('')
const DEFAULT_ABOUT_TEMPLATE = `
<div class="about-line"><strong>应用名称：</strong>{{appName}}</div>
<div class="about-line"><strong>版本：</strong>{{version}}</div>
<div class="about-line"><strong>当前分类数：</strong>{{categoryCount}}</div>
<div class="about-line"><strong>当前网址数：</strong>{{itemCount}}</div>
<div class="about-line"><strong>功能概览：</strong>支持层级分类、内外网地址切换、收藏、浏览器书签导入导出。</div>
<div class="about-line"><strong>最近能力：</strong>系统应用设置、多级分类、浏览器书签 HTML 兼容导出。</div>`

const UI_SETTINGS_STORAGE_KEY = 'navigation-panel-ui-settings'
const defaultUiSettings = {
  showAddButton: true,
  showClock: true,
  showClockSeconds: true,
  showSearch: true,
  showRefreshButton: true,
  showViewModeButton: true,
  showNetworkModeButton: true,
  showDarkModeButton: true,
  showHealthBadge: true,
  settingsDrawerSide: 'left',
  gridCardSize: 100,
  gridCardRadius: 35,
  wallpaper: '',
  wallpaperOpacity: 0.18,
  wallpaperBlur: 2
}

const WALLPAPER_MAX_DATA_URL_SIZE = 1_600_000
const WALLPAPER_DOWNLOAD_JPEG_QUALITY = 0.92
const LAST_UPLOADED_WALLPAPER_STORAGE_KEY = 'navigation-panel-last-uploaded-wallpaper'
// 导入条数统一上限。
// 后续如果要放宽或收紧所有导入入口的限制，只需要修改这里。
const IMPORT_ITEM_LIMIT = 2000

// ============================================================
// 【新增功能 8】服务连通性检测 —— 常量与全局配置
// 严格约束：只新增，不修改任何现有逻辑/UI。所有新增变量以 health 为前缀。
// ============================================================
const HEALTH_UI_SETTINGS_STORAGE_KEY = 'navigation-panel-health-settings'
const defaultHealthUiSettings = {
  settingsVersion: 2,
  globalEnabled: true,
  autoCheckOnStart: false,
  pollingEnabled: false,
  pollingInterval: 60,
  defaultTimeout: 5000,
  concurrency: 5,
  showLatency: true
}
// 条目级 healthCheck 默认值（用于"重置为默认"/批量启用时的兜底）
const defaultItemHealthCheck = {
  enabled: false,
  strategy: 'auto',
  timeout: 5000,
  checkTarget: 'follow'
}

// 搜索查询
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
let searchDebounceTimer = null
const manageSearchQuery = ref('')

// 视图模式：grid 或 list
const viewMode = ref('grid')

// 网络模式：internal 或 external
const networkMode = ref('internal')

// 菜单关闭定时器
let resetMenuCloseTimer = null
let importExportMenuCloseTimer = null

// 暗黑模式
const darkMode = ref(false)
const favoritesCollapsed = ref(false)
const uiSettings = ref({ ...defaultUiSettings })
const wallpaperUrlInput = ref('')
const personalizationPanelRef = ref(null)
const wallpaperPreview = ref('')
const lastUploadedWallpaper = ref('')
let wallpaperPreviewTimer = null
let uiSettingsSaveTimer = null
let dataSaveTimer = null

// 当前激活的菜单项
const activeMenu = ref(null)

// 分类管理中的激活菜单
const activeCategoryMenu = ref(null)
const activeItemMenuInManage = ref(null)
const toast = ref({
  visible: false,
  message: '',
  type: 'success'
})

// 菜单关闭定时器
let menuCloseTimer = null
let menuAutoCloseTimer = null
let manageMenuCloseTimer = null
let toastTimer = null

// 浏览器HTML导入对话框
const browserImportDialog = ref({
  visible: false,
  fileName: '',
  fileSize: 0,
  fileContent: '',
  mode: 'internal', // 'internal' 或 'external'
  defaultCategory: '',
  newCategoryName: '',
  processing: false,
  parseResult: null
})

const exportDataDialog = ref({
  visible: false
})

// 浏览器文件输入引用
const browserFileInput = ref(null)

// URL 提示框状态
const urlTooltip = ref({
  visible: false,
  mode: '',
  internalUrl: '',
  externalUrl: '',
  note: '',
  placement: 'top',
  x: 0,
  y: 0
})

// 文件输入引用
const fileInput = ref(null)

// 导入导出菜单可见性
const importExportMenuVisible = ref(false)

// 重置菜单可见性
const resetMenuVisible = ref(false)

const settingsSections = [
  { id: 'category-management', label: '分类管理', icon: '🗂️', description: '管理分类层级与网址项目' },
  { id: 'personalization', label: '个性化设置', icon: '🎨', description: '调整视图、主题和默认行为' },
  { id: 'data-management', label: '数据管理', icon: '🗃️', description: '导入、导出、重置与刷新数据' },
  { id: 'about', label: '关于', icon: 'ℹ️', description: '查看应用信息与当前状态' }
]

const settingsSectionMeta = Object.fromEntries(settingsSections.map(section => [section.id, section]))

// 系统应用设置对话框
const settingsDialog = ref({
  visible: false,
  activeSection: 'category-management',
  navCollapsed: true
})

// 侧边栏宽度（可拖拽调整）
const sidebarWidth = ref(532)
let isResizing = false
let resizeStartX = 0
let resizeStartWidth = 0

const toggleSettingsNav = () => {
  settingsDialog.value.navCollapsed = !settingsDialog.value.navCollapsed
}

const startSidebarResize = (e) => {
  isResizing = true
  resizeStartX = e.clientX
  resizeStartWidth = sidebarWidth.value
  document.addEventListener('mousemove', handleSidebarResize)
  document.addEventListener('mouseup', stopSidebarResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleSidebarResize = (e) => {
  if (!isResizing) return
  const diff = settingsDrawerSide.value === 'right'
    ? resizeStartX - e.clientX
    : e.clientX - resizeStartX
  const newWidth = resizeStartWidth + diff
  sidebarWidth.value = Math.max(280, Math.min(newWidth, window.innerWidth * 0.8))
}

const stopSidebarResize = () => {
  isResizing = false
  document.removeEventListener('mousemove', handleSidebarResize)
  document.removeEventListener('mouseup', stopSidebarResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// 分类表单对话框
const categoryFormDialog = ref({
  visible: false,
  mode: 'add', // 'add' 或 'edit'
  editingCategory: null,
  form: {
    name: '',
    icon: '',
    parentId: null
  }
})

// 分类名称输入框引用
const categoryNameInput = ref(null)

// 对话框状态
const dialog = ref({
  visible: false,
  mode: 'add', // 'add' 或 'edit'
  targetCategory: null,
  editingItem: null,
  form: {
    name: '',
    categoryId: '',
    internalUrl: '',
    externalUrl: '',
    note: '',
    iconUrl: '',
    icon: '🌐'
  }
})

// 分类数据
const categories = ref([
  {
    id: 'common',
    name: '常用',
    collapsed: false,
    items: [
      { 
        id: 1, 
        name: '百度', 
        icon: '🔍', 
        iconUrl: '',
        internalUrl: '',
        note: '',
        externalUrl: 'https://www.baidu.com'
      }
    ]
  },
  {
    id: 'web-service',
    name: 'Web 服务',
    collapsed: false,
    items: [
      { id: 11, name: 'HTTP', icon: '⭐', iconUrl: '', internalUrl: 'http://localhost:8080', externalUrl: '', note: '' },
      { id: 12, name: 'HTTPS', icon: '🔒', iconUrl: '', internalUrl: 'https://localhost:8443', externalUrl: '', note: '' },
      { id: 13, name: 'Nginx', icon: '🌐', iconUrl: '', internalUrl: 'http://localhost:80', externalUrl: '', note: '' },
      { id: 14, name: 'Web 服务', icon: '🌐', iconUrl: '', internalUrl: 'http://127.0.0.1:8080', externalUrl: '', note: '' }
    ]
  },
  {
    id: 'frontend',
    name: '前端开发',
    collapsed: false,
    items: [
      { id: 21, name: 'React / Node', icon: '⚛️', iconUrl: '', internalUrl: 'http://localhost:3000', externalUrl: '', note: '' },
      { id: 22, name: 'Vite', icon: '⚡', iconUrl: '', internalUrl: 'http://localhost:5173', externalUrl: '', note: '' },
      { id: 23, name: 'Python Web', icon: '🐍', iconUrl: '', internalUrl: 'http://localhost:5000', externalUrl: '', note: '' }
    ]
  },
  {
    id: 'database',
    name: '数据库',
    collapsed: false,
    items: [
      { id: 31, name: 'MySQL', icon: '🐬', iconUrl: '', internalUrl: 'mysql://localhost:3306', externalUrl: '', note: '' },
      { id: 32, name: 'PostgreSQL', icon: '🐘', iconUrl: '', internalUrl: 'postgresql://localhost:5432', externalUrl: '', note: '' },
      { id: 33, name: 'MongoDB', icon: '🍃', iconUrl: '', internalUrl: 'mongodb://localhost:27017', externalUrl: '', note: '' },
      { id: 34, name: 'Redis', icon: '⚡', iconUrl: '', internalUrl: 'redis://localhost:6379', externalUrl: '', note: '' },
      { id: 35, name: 'SQL Server', icon: '💾', iconUrl: '', internalUrl: 'sqlserver://localhost:1433', externalUrl: '', note: '' },
      { id: 36, name: 'Oracle', icon: '🔶', iconUrl: '', internalUrl: 'oracle://localhost:1521', externalUrl: '', note: '' }
    ]
  }
])

const FAVORITES_CATEGORY_ID = 'common'
const FAVORITES_CATEGORY_NAME = '喜欢'
const LEGACY_FAVORITES_CATEGORY_NAME = '常用'

const createFavoritesCategory = () => ({
  id: FAVORITES_CATEGORY_ID,
  name: FAVORITES_CATEGORY_NAME,
  collapsed: false,
  items: []
})

const isFavoritesCategory = (category) => {
  return category?.id === FAVORITES_CATEGORY_ID ||
    category?.name === FAVORITES_CATEGORY_NAME ||
    category?.name === LEGACY_FAVORITES_CATEGORY_NAME
}

const normalizeParentId = (value) => {
  return value == null || value === '' ? null : value
}

const getRegularCategoriesFromList = (list) => {
  return list.filter(category => !isFavoritesCategory(category))
}

const getChildrenFromList = (list, parentId = null) => {
  const normalizedParentId = normalizeParentId(parentId)
  return list.filter(category => normalizeParentId(category.parentId) === normalizedParentId)
}

const getOrderedCategoriesFromList = (list) => {
  const regularList = getRegularCategoriesFromList(list)
  const ordered = []
  const visited = new Set()

  const visit = (parentId, lineage = new Set()) => {
    const children = getChildrenFromList(regularList, parentId)
    children.forEach(category => {
      if (visited.has(category.id) || lineage.has(category.id)) {
        return
      }

      visited.add(category.id)
      ordered.push(category)
      visit(category.id, new Set([...lineage, category.id]))
    })
  }

  visit(null)

  regularList.forEach(category => {
    if (!visited.has(category.id)) {
      visited.add(category.id)
      ordered.push(category)
      visit(category.id, new Set([category.id]))
    }
  })

  return ordered
}

const regularCategories = computed(() => {
  return getRegularCategoriesFromList(categories.value)
})

const orderedRegularCategories = computed(() => {
  return getOrderedCategoriesFromList(categories.value)
})

const regularCategoryMap = computed(() => {
  return new Map(regularCategories.value.map(category => [category.id, category]))
})

const categoryMetaMap = computed(() => {
  const map = new Map()

  for (const category of orderedRegularCategories.value) {
    const pathCategories = []
    const pathNames = []
    const visited = new Set()
    let currentCategory = category

    while (currentCategory && !visited.has(currentCategory.id)) {
      visited.add(currentCategory.id)
      pathCategories.unshift(currentCategory)
      pathNames.unshift(currentCategory.name)
      currentCategory = normalizeParentId(currentCategory.parentId)
        ? getRegularCategoryById(currentCategory.parentId)
        : null
    }

    map.set(category.id, {
      pathCategories,
      pathNames,
      displayName: pathNames.join(' / '),
      depth: Math.max(0, pathCategories.length - 1)
    })
  }

  return map
})

const favoriteCategory = computed(() => {
  return categories.value.find(category => isFavoritesCategory(category)) || null
})

const favoriteItems = computed(() => {
  return favoriteCategory.value?.items || []
})

const buildItemSignature = (item) => {
  return [
    item?.name || '',
    item?.internalUrl || '',
    item?.externalUrl || '',
    item?.iconUrl || ''
  ].join('||')
}

const regularItemIndex = computed(() => {
  const byId = new Map()
  const bySignature = new Map()
  const categoryByItemId = new Map()

  for (const category of orderedRegularCategories.value) {
    for (const item of category.items) {
      byId.set(item.id, item)
      bySignature.set(buildItemSignature(item), item)
      categoryByItemId.set(item.id, category)
    }
  }

  return {
    byId,
    bySignature,
    categoryByItemId
  }
})

const favoriteLookupMap = computed(() => {
  const lookup = new Map()

  for (const item of favoriteItems.value) {
    if (item?.sourceItemId != null) {
      lookup.set(item.sourceItemId, item)
      continue
    }

    if (item?.id != null) {
      lookup.set(item.id, item)
    }
  }

  return lookup
})

const favoriteSourceIds = computed(() => {
  return new Set(favoriteLookupMap.value.keys())
})

const normalizedSearchQuery = computed(() => debouncedSearchQuery.value.trim().toLowerCase())

const getRegularCategoryById = (categoryId) => {
  return regularCategoryMap.value.get(categoryId) || null
}

const getCategoryPathCategories = (categoryOrId) => {
  const categoryId = typeof categoryOrId === 'object' ? categoryOrId?.id : categoryOrId
  return categoryMetaMap.value.get(categoryId)?.pathCategories || []
}

const getCategoryPathNames = (categoryOrId) => {
  const categoryId = typeof categoryOrId === 'object' ? categoryOrId?.id : categoryOrId
  return categoryMetaMap.value.get(categoryId)?.pathNames || []
}

const formatCategoryPath = (categoryOrId) => {
  const categoryId = typeof categoryOrId === 'object' ? categoryOrId?.id : categoryOrId
  return categoryMetaMap.value.get(categoryId)?.displayName || ''
}

const getCategoryDepth = (categoryOrId) => {
  const categoryId = typeof categoryOrId === 'object' ? categoryOrId?.id : categoryOrId
  return categoryMetaMap.value.get(categoryId)?.depth || 0
}

const collectSubtreeCategoryIdsFromList = (categoryId, categoryList) => {
  const childrenMap = new Map()

  categoryList.forEach(category => {
    const parentId = normalizeParentId(category.parentId)
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, [])
    }
    childrenMap.get(parentId).push(category)
  })

  const result = []
  const stack = [categoryId]
  const visited = new Set()

  while (stack.length > 0) {
    const currentId = stack.pop()
    if (visited.has(currentId)) {
      continue
    }

    visited.add(currentId)
    result.push(currentId)

    const children = childrenMap.get(currentId) || []
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push(children[index].id)
    }
  }

  return result
}

const collectSubtreeCategoryIds = (categoryId) => {
  return collectSubtreeCategoryIdsFromList(categoryId, orderedRegularCategories.value)
}

const findCategoryByItemId = (itemId) => {
  return regularItemIndex.value.categoryByItemId.get(itemId) || null
}

const findRegularItemById = (itemId) => {
  return regularItemIndex.value.byId.get(itemId) || null
}

const findMatchingRegularItem = (item) => {
  return regularItemIndex.value.bySignature.get(buildItemSignature(item)) || null
}

const resolveFavoriteItem = (item) => {
  if (item?.sourceItemId != null) {
    const source = findRegularItemById(item.sourceItemId)
    if (source) {
      return {
        ...source,
        favoriteId: item.id,
        sourceItemId: item.sourceItemId
      }
    }
  }
  return item
}

const matchesSearchQuery = (item, query) => {
  if (!query) {
    return true
  }

  return item.name.toLowerCase().includes(query) ||
    (item.note && item.note.toLowerCase().includes(query)) ||
    (item.internalUrl && item.internalUrl.toLowerCase().includes(query)) ||
    (item.externalUrl && item.externalUrl.toLowerCase().includes(query))
}

const displayedFavoriteItems = computed(() => {
  const resolvedFavorites = favoriteItems.value.map(resolveFavoriteItem)

  if (!normalizedSearchQuery.value) {
    return resolvedFavorites
  }

  return resolvedFavorites.filter(item => matchesSearchQuery(item, normalizedSearchQuery.value))
})

const selectableCategories = computed(() => {
  return orderedRegularCategories.value
})

const categoryFormParentOptions = computed(() => {
  const editingCategoryId = categoryFormDialog.value.editingCategory?.id || null
  const disallowedIds = new Set(editingCategoryId ? collectSubtreeCategoryIds(editingCategoryId) : [])

  return orderedRegularCategories.value.filter(category => !disallowedIds.has(category.id))
})

// 过滤后的分类
const filteredCategories = computed(() => {
  const baseCategories = orderedRegularCategories.value

  if (!normalizedSearchQuery.value) {
    return baseCategories.map(category => ({
      ...category,
      displayName: categoryMetaMap.value.get(category.id)?.displayName || category.name,
      depth: categoryMetaMap.value.get(category.id)?.depth || 0
    }))
  }

  return baseCategories.map(category => ({
    ...category,
    displayName: categoryMetaMap.value.get(category.id)?.displayName || category.name,
    depth: categoryMetaMap.value.get(category.id)?.depth || 0,
    items: category.items.filter(item => matchesSearchQuery(item, normalizedSearchQuery.value))
  })).filter(category => category.items.length > 0)
})

const filteredManageCategories = computed(() => {
  const query = manageSearchQuery.value.trim().toLowerCase()
  const baseCategories = orderedRegularCategories.value

  if (!query) {
    return baseCategories.map(category => ({
      ...category,
      displayName: categoryMetaMap.value.get(category.id)?.displayName || category.name,
      depth: categoryMetaMap.value.get(category.id)?.depth || 0,
      items: category.items
    }))
  }

  return baseCategories.map(category => ({
    ...category,
    displayName: categoryMetaMap.value.get(category.id)?.displayName || category.name,
    depth: categoryMetaMap.value.get(category.id)?.depth || 0,
    items: category.items.filter(item => matchesSearchQuery(item, query))
  })).filter(category =>
    category.displayName.toLowerCase().includes(query) || category.items.length > 0
  )
})

// 判断是否所有分类都已折叠
const allCollapsed = computed(() => {
  return orderedRegularCategories.value.length > 0 && orderedRegularCategories.value.every(cat => cat.collapsed)
})

// 总网址数量
const totalItemsCount = computed(() => {
  return orderedRegularCategories.value.reduce((total, category) => total + category.items.length, 0)
})

// 关于模块：从运行时加载的模板渲染 HTML，替换动态占位符
const aboutContentHtml = computed(() => {
  const template = aboutTemplateContent.value || DEFAULT_ABOUT_TEMPLATE
  return template
    .replace(/\{\{appName\}\}/g, '导航面板')
    .replace(/\{\{version\}\}/g, '1.0.0')
    .replace(/\{\{categoryCount\}\}/g, String(orderedRegularCategories.value.length))
    .replace(/\{\{itemCount\}\}/g, String(totalItemsCount.value))
})

const hasWallpaper = computed(() => Boolean((uiSettings.value.wallpaper || '').trim()))
const hasLastUploadedWallpaper = computed(() => Boolean((lastUploadedWallpaper.value || '').trim()))
const settingsDrawerSide = computed(() => uiSettings.value.settingsDrawerSide === 'right' ? 'right' : 'left')

const navigationPanelStyle = computed(() => {
  const cardSize = Math.min(120, Math.max(20, Number(uiSettings.value.gridCardSize || 100)))
  const cardRadius = Math.min(100, Math.max(0, Number(uiSettings.value.gridCardRadius || 35)))
  const radiusPx = cardRadius <= 50
    ? Math.round(2 + (cardRadius / 50) * 18)
    : Math.round(20 + ((cardRadius - 50) / 50) * 999)
  const iconRadiusPx = cardRadius <= 50
    ? Math.round(2 + (cardRadius / 50) * 14)
    : Math.round(16 + ((cardRadius - 50) / 50) * 999)
  const baseStyle = {
    '--grid-card-min': `${Math.round(104 * cardSize / 100)}px`,
    '--grid-card-min-height': `${Math.round(138 * cardSize / 100)}px`,
    '--grid-card-padding-y': `${Math.max(4, Math.round(12 * cardSize / 100))}px`,
    '--grid-card-padding-x': `${Math.max(4, Math.round(8 * cardSize / 100))}px`,
    '--grid-card-icon-box': `${Math.max(18, Math.round(44 * cardSize / 100))}px`,
    '--grid-card-icon-size': `${Math.max(12, Math.round(24 * cardSize / 100))}px`,
    '--grid-card-emoji-size': `${Math.max(0.8, 1.55 * cardSize / 100).toFixed(2)}rem`,
    '--grid-card-name-size': `${Math.max(0.58, 0.76 * cardSize / 100).toFixed(2)}rem`,
    '--grid-card-note-size': `${Math.max(0.52, 0.68 * cardSize / 100).toFixed(2)}rem`,
    '--grid-card-radius': cardRadius >= 95 ? '999px' : `${radiusPx}px`,
    '--grid-card-icon-radius': cardRadius >= 95 ? '999px' : `${iconRadiusPx}px`
  }

  if (!hasWallpaper.value) {
    return baseStyle
  }

  const overlayAlpha = Number(uiSettings.value.wallpaperOpacity || 0)
  return {
    ...baseStyle,
    backgroundImage: `linear-gradient(rgba(255,255,255,${overlayAlpha}), rgba(255,255,255,${overlayAlpha})), url("${uiSettings.value.wallpaper}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    '--wallpaper-blur': `${uiSettings.value.wallpaperBlur || 0}px`
  }
})

const wallpaperPreviewStyle = computed(() => {
  if (!wallpaperPreview.value) {
    return {}
  }

  return {
    backgroundImage: `url("${wallpaperPreview.value}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }
})

const isInlineWallpaperSource = (value) => /^data:/i.test(String(value || '').trim())

const wallpaperInputValueForSource = (value) => {
  const source = String(value || '').trim()
  return isInlineWallpaperSource(source) ? '' : source
}

const clearWallpaperPreviewTimer = () => {
  if (wallpaperPreviewTimer) {
    clearTimeout(wallpaperPreviewTimer)
    wallpaperPreviewTimer = null
  }
}

// 运行时加载关于模板文件（构建后可在 dist/ 下直接编辑 about-template.html，无需二次build）
const loadAboutTemplate = async () => {
  try {
    const response = await fetch('./about-template.html')
    if (response.ok) {
      const text = await response.text()
      // 提取 body 内的内容（过滤掉注释和 doctype 等）
      const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      aboutTemplateContent.value = bodyMatch ? bodyMatch[1].trim() : text
    }
  } catch {
    // 加载失败使用内置默认模板（DEFAULT_ABOUT_TEMPLATE）
  }
}

// 更新时间
onMounted(() => {
  loadUiSettings()
  loadData()
  loadDarkMode()
  loadAboutTemplate()
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  clearWallpaperPreviewTimer()
  flushUiSettingsSave()
  flushDataSave()
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
  clearActiveMenuAutoClose()
  document.removeEventListener('click', handleGlobalClick)
})

// 切换视图模式
const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
}

// 切换网络模式
const toggleNetworkMode = () => {
  networkMode.value = networkMode.value === 'internal' ? 'external' : 'internal'
}

// 切换暗黑模式
const toggleDarkMode = () => {
  darkMode.value = !darkMode.value
  saveDarkMode()
}

// 加载暗黑模式设置
const loadDarkMode = () => {
  const saved = localStorage.getItem('navigation-panel-dark-mode')
  if (saved !== null) {
    darkMode.value = saved === 'true'
  }
}

// 保存暗黑模式设置
const saveDarkMode = () => {
  localStorage.setItem('navigation-panel-dark-mode', darkMode.value.toString())
}

const loadUiSettings = () => {
  try {
    const saved = localStorage.getItem(UI_SETTINGS_STORAGE_KEY)
    if (!saved) {
      wallpaperUrlInput.value = ''
      wallpaperPreview.value = ''
      lastUploadedWallpaper.value = localStorage.getItem(LAST_UPLOADED_WALLPAPER_STORAGE_KEY) || ''
      return
    }

    const parsed = JSON.parse(saved)
    uiSettings.value = {
      ...defaultUiSettings,
      ...parsed
    }
    wallpaperUrlInput.value = wallpaperInputValueForSource(uiSettings.value.wallpaper)
    wallpaperPreview.value = uiSettings.value.wallpaper || ''
    lastUploadedWallpaper.value = localStorage.getItem(LAST_UPLOADED_WALLPAPER_STORAGE_KEY) || ''
  } catch (error) {
    console.error('加载界面设置失败:', error)
    uiSettings.value = { ...defaultUiSettings }
    wallpaperUrlInput.value = ''
    wallpaperPreview.value = ''
    lastUploadedWallpaper.value = localStorage.getItem(LAST_UPLOADED_WALLPAPER_STORAGE_KEY) || ''
  }
}

const flushUiSettingsSave = () => {
  if (uiSettingsSaveTimer) {
    clearTimeout(uiSettingsSaveTimer)
    uiSettingsSaveTimer = null
  }

  localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(uiSettings.value))
}

const saveUiSettings = (options = {}) => {
  const { immediate = false } = options

  if (immediate) {
    flushUiSettingsSave()
    return
  }

  if (uiSettingsSaveTimer) {
    clearTimeout(uiSettingsSaveTimer)
  }

  uiSettingsSaveTimer = setTimeout(() => {
    flushUiSettingsSave()
  }, 220)
}

const scheduleWallpaperPreviewUpdate = () => {
  clearWallpaperPreviewTimer()

  wallpaperPreviewTimer = setTimeout(() => {
    wallpaperPreview.value = wallpaperUrlInput.value.trim()
    wallpaperPreviewTimer = null
  }, 260)
}

const handleWallpaperUrlInput = (value) => {
  if (typeof value === 'string') {
    wallpaperUrlInput.value = value
  }
  scheduleWallpaperPreviewUpdate()
}

const refreshWallpaperPreview = async () => {
  clearWallpaperPreviewTimer()
  const raw = wallpaperUrlInput.value.trim()
  if (!raw) {
    wallpaperPreview.value = ''
    showToast('请先输入壁纸图片网址，再点击重新获取', 'warning')
    return
  }

  const cacheBreaker = raw.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`
  const previewUrl = `${raw}${cacheBreaker}`
  try {
    await loadImageElement(previewUrl)
    wallpaperPreview.value = previewUrl
    showToast('已重新获取壁纸预览')
  } catch (error) {
    console.warn('重新获取壁纸失败:', error)
    showToast('获取不到图片，请检查图片网址是否正确或可访问', 'warning')
  }
}

const triggerWallpaperFileInput = () => {
  personalizationPanelRef.value?.triggerWallpaperFileInput?.()
}

const loadImageElement = (src) => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error('图片加载失败'))
  img.src = src
})

const canvasToDataUrl = (canvas, quality) => {
  try {
    return canvas.toDataURL('image/webp', quality)
  } catch (error) {
    return canvas.toDataURL('image/jpeg', quality)
  }
}

const compressWallpaperDataUrl = async (sourceDataUrl) => {
  const image = await loadImageElement(sourceDataUrl)
  const viewportWidth = Math.max(window.innerWidth || 1366, 1280)
  const viewportHeight = Math.max(window.innerHeight || 768, 720)
  const maxEdge = Math.min(2200, Math.max(viewportWidth, viewportHeight) * 1.35)
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
  let targetWidth = Math.max(1, Math.round(image.width * scale))
  let targetHeight = Math.max(1, Math.round(image.height * scale))

  let quality = 0.86
  let result = sourceDataUrl

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) {
      throw new Error('无法创建图片压缩上下文')
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight)
    result = canvasToDataUrl(canvas, quality)

    if (result.length <= WALLPAPER_MAX_DATA_URL_SIZE) {
      return {
        dataUrl: result,
        width: targetWidth,
        height: targetHeight
      }
    }

    quality = Math.max(0.58, quality - 0.08)
    targetWidth = Math.max(960, Math.round(targetWidth * 0.86))
    targetHeight = Math.max(540, Math.round(targetHeight * 0.86))
  }

  return {
    dataUrl: result,
    width: targetWidth,
    height: targetHeight
  }
}

const handleWallpaperFileSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件', 'warning')
    return
  }

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const result = String(e.target?.result || '')
      const compressed = await compressWallpaperDataUrl(result)
      clearWallpaperPreviewTimer()
      wallpaperUrlInput.value = ''
      wallpaperPreview.value = compressed.dataUrl
      lastUploadedWallpaper.value = compressed.dataUrl
      localStorage.setItem(LAST_UPLOADED_WALLPAPER_STORAGE_KEY, compressed.dataUrl)
      showToast(`壁纸预览已更新（已压缩为 ${compressed.width}×${compressed.height}）`)
    } catch (error) {
      console.error('压缩壁纸失败:', error)
      showToast('压缩壁纸失败: ' + error.message, 'error')
    }
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

const applyWallpaper = () => {
  const nextWallpaper = (wallpaperPreview.value || wallpaperUrlInput.value || '').trim()
  if (!nextWallpaper) {
    showToast('请先上传图片或填写图片网址', 'warning')
    return
  }

  uiSettings.value.wallpaper = nextWallpaper
  wallpaperUrlInput.value = wallpaperInputValueForSource(nextWallpaper)
  wallpaperPreview.value = nextWallpaper
  showToast('主页面壁纸已设置')
}

const useLastUploadedWallpaper = () => {
  if (!hasLastUploadedWallpaper.value) {
    showToast('暂无可用的上传图片', 'warning')
    return
  }

  clearWallpaperPreviewTimer()
  wallpaperUrlInput.value = ''
  wallpaperPreview.value = lastUploadedWallpaper.value
  showToast('已载入最后一次上传图片，请点击“设置为壁纸”应用')
}

const dataUrlToBlob = (dataUrl) => {
  const parts = String(dataUrl || '').match(/^data:([^;,]+)?(;base64)?,(.*)$/)
  if (!parts) {
    throw new Error('壁纸数据格式无效')
  }

  const mimeType = parts[1] || 'application/octet-stream'
  const isBase64 = Boolean(parts[2])
  const data = isBase64 ? atob(parts[3]) : decodeURIComponent(parts[3])
  const bytes = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) {
    bytes[i] = data.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

const wallpaperBlobToJpegBlob = async (blob) => {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const image = await loadImageElement(objectUrl)
    const width = Math.max(1, image.naturalWidth || image.width || 1)
    const height = Math.max(1, image.naturalHeight || image.height || 1)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) {
      throw new Error('无法创建图片下载上下文')
    }

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    return await new Promise((resolve, reject) => {
      canvas.toBlob((jpegBlob) => {
        if (!jpegBlob) {
          reject(new Error('无法生成 JPG 图片'))
          return
        }
        resolve(jpegBlob)
      }, 'image/jpeg', WALLPAPER_DOWNLOAD_JPEG_QUALITY)
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const downloadCurrentWallpaper = async () => {
  const source = String(uiSettings.value.wallpaper || '').trim()
  if (!source) {
    showToast('当前没有可下载的壁纸', 'warning')
    return
  }

  try {
    let blob
    if (isInlineWallpaperSource(source)) {
      blob = dataUrlToBlob(source)
    } else {
      const response = await fetch(source, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      blob = await response.blob()
    }

    const jpegBlob = await wallpaperBlobToJpegBlob(blob)
    downloadBlob(jpegBlob, `hpannel-wallpaper-${Date.now()}.jpg`)
    showToast('当前壁纸已开始下载')
  } catch (error) {
    console.warn('下载当前壁纸失败:', error)
    showToast('当前壁纸无法直接下载，请检查图片来源或稍后重试', 'warning')
  }
}

const clearWallpaper = () => {
  wallpaperUrlInput.value = ''
  wallpaperPreview.value = ''
  uiSettings.value.wallpaper = ''
}

const clearActiveMenuAutoClose = () => {
  if (menuAutoCloseTimer) {
    clearTimeout(menuAutoCloseTimer)
    menuAutoCloseTimer = null
  }
}

const closeActiveMenu = () => {
  clearActiveMenuAutoClose()
  activeMenu.value = null
}

const scheduleActiveMenuAutoClose = () => {
  clearActiveMenuAutoClose()
  if (!activeMenu.value) return
  menuAutoCloseTimer = setTimeout(() => {
    closeActiveMenu()
  }, 1000)
}

// 切换项目菜单
const toggleItemMenu = (itemId) => {
  hideUrlTooltip()
  clearActiveMenuAutoClose()
  if (activeMenu.value === itemId) {
    closeActiveMenu()
  } else {
    activeMenu.value = itemId
    activeItemMenuInManage.value = null
    scheduleActiveMenuAutoClose()
  }
}

const buildItemFullText = (item) => {
  const sourceId = item.sourceItemId ?? item.id
  const category = regularItemIndex.value.categoryByItemId.get(sourceId) || null
  return [
    `名称：${item.name || ''}`,
    `分类：${category ? formatCategoryPath(category) : '未分类'}`,
    `内网地址：${item.internalUrl || '未设置'}`,
    `外网地址：${item.externalUrl || '未设置'}`,
    `备注：${item.note || '无'}`
  ].join('\n')
}

const showToast = (message, type = 'success') => {
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
  const duration = Math.min(4200, Math.max(1800, 1400 + String(message).length * 28))
  toast.value = {
    visible: true,
    message,
    type
  }
  toastTimer = setTimeout(() => {
    toast.value.visible = false
  }, duration)
}

const copyItemInfo = async (item) => {
  const text = buildItemFullText(item)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      showToast('复制完成')
      return
    }
  } catch (error) {
    console.warn('Clipboard API copy failed, falling back.', error)
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  showToast('复制完成')
}

watch(
  uiSettings,
  () => {
    saveUiSettings()
  },
  { deep: true }
)

watch(
  searchQuery,
  (value) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    searchDebounceTimer = setTimeout(() => {
      debouncedSearchQuery.value = value
    }, 140)
  },
  { immediate: true }
)

const handleGridItemClick = (item) => {
  hideUrlTooltip()
  toggleItemMenu(item.id)
}

const handleItemDoubleClick = (item) => {
  openItem(item, { force: true })
}

const handleListItemClick = (item) => {
  copyItemInfo(item)
}

const handleManageItemClick = (item) => {
  copyItemInfo(item)
}

const handleGlobalClick = () => {
  closeActiveMenu()
  activeItemMenuInManage.value = null
  activeCategoryMenu.value = null
  cancelHealthCategoryDropdownClose()
  healthCategoryDropdownOpen.value = false
}

// 切换所有分类的折叠状态
const toggleAllCategories = () => {
  const shouldCollapse = !allCollapsed.value
  orderedRegularCategories.value.forEach(category => {
    category.collapsed = shouldCollapse
  })
}

const toggleFavoritesCollapsed = () => {
  favoritesCollapsed.value = !favoritesCollapsed.value
}

const toggleSettingsDrawerSide = () => {
  uiSettings.value.settingsDrawerSide = settingsDrawerSide.value === 'left' ? 'right' : 'left'
}

// 处理卡片鼠标进入事件
const handleCardMouseEnter = (item, event) => {
  // 清除关闭定时器
  if (menuCloseTimer) {
    clearTimeout(menuCloseTimer)
    menuCloseTimer = null
  }
  // 显示URL提示框
  showUrlTooltip(item, event)
}

// 处理卡片鼠标离开事件
const handleCardMouseLeave = () => {
  // 清除之前的定时器
  if (menuCloseTimer) {
    clearTimeout(menuCloseTimer)
  }
  // 0.5秒后关闭菜单
  menuCloseTimer = setTimeout(() => {
    closeActiveMenu()
    hideUrlTooltip()
  }, 500)
}

// 清除菜单关闭定时器（鼠标进入菜单时调用）
const clearMenuCloseTimer = () => {
  if (menuCloseTimer) {
    clearTimeout(menuCloseTimer)
    menuCloseTimer = null
  }
}

// 处理分类管理中项目鼠标进入事件
const handleManageItemMouseEnter = (item, event) => {
  // 清除关闭定时器
  if (manageMenuCloseTimer) {
    clearTimeout(manageMenuCloseTimer)
    manageMenuCloseTimer = null
  }
  // 显示URL提示框
  showManageItemTooltip(item, event)
}

// 处理分类管理中项目鼠标离开事件
const handleManageItemMouseLeave = () => {
  // 清除之前的定时器
  if (manageMenuCloseTimer) {
    clearTimeout(manageMenuCloseTimer)
  }
  // 0.5秒后关闭菜单
  manageMenuCloseTimer = setTimeout(() => {
    activeItemMenuInManage.value = null
    hideUrlTooltip()
  }, 500)
}

// 切换分类折叠状态
const toggleCategory = (categoryId) => {
  const category = categories.value.find(c => c.id === categoryId)
  if (category) {
    category.collapsed = !category.collapsed
  }
}

// 打开项目
const openItem = (item, options = {}) => {
  if (!options.force && activeMenu.value) return

  closeActiveMenu()
  activeItemMenuInManage.value = null

  // 根据网络模式选择对应的 URL
  let url = ''
  if (networkMode.value === 'internal') {
    url = item.internalUrl || item.externalUrl
  } else {
    url = item.externalUrl || item.internalUrl
  }
  
  if (url) {
    // 如果URL不包含协议，自动添加 http://
    if (!url.match(/^[a-zA-Z]+:\/\//)) {
      url = 'http://' + url
    }
    
    if (typeof window.utools !== 'undefined') {
      window.utools.shellOpenExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }
}

const isFavoriteItem = (item) => {
  return favoriteSourceIds.value.has(item.id) ||
    favoriteLookupMap.value.has(item.id) ||
    favoriteLookupMap.value.has(item.favoriteId)
}

const ensureFavoritesCategory = () => {
  let category = categories.value.find(c => isFavoritesCategory(c))
  if (!category) {
    category = createFavoritesCategory()
    categories.value.unshift(category)
  }
  category.id = FAVORITES_CATEGORY_ID
  category.name = FAVORITES_CATEGORY_NAME
  if (!Array.isArray(category.items)) {
    category.items = []
  }
  return category
}

const normalizeCategories = (loadedCategories) => {
  const source = Array.isArray(loadedCategories) ? loadedCategories : []
  const normalized = []
  let favorites = null

  source.forEach(category => {
    if (!category || typeof category !== 'object') {
      return
    }

    const normalizedCategory = {
      ...category,
      parentId: normalizeParentId(category.parentId),
      collapsed: Boolean(category.collapsed),
      items: Array.isArray(category.items)
        ? category.items.map(item => ({
            ...item,
            note: item?.note || ''
          }))
        : []
    }

    if (isFavoritesCategory(normalizedCategory)) {
      if (!favorites) {
        favorites = createFavoritesCategory()
      }
      favorites.collapsed = normalizedCategory.collapsed
      normalizedCategory.items.forEach(item => {
        const matchedItem = item?.sourceItemId != null
          ? findRegularItemById(item.sourceItemId)
          : findMatchingRegularItem(item)

        favorites.items.push({
          ...item,
          sourceItemId: matchedItem ? matchedItem.id : item?.sourceItemId
        })
      })
      return
    }

    normalized.push(normalizedCategory)
  })

  if (favorites) {
    normalized.unshift(favorites)
  }

  return normalized
}

// 添加到喜欢
const addToFavorites = (item) => {
  closeActiveMenu()
  activeItemMenuInManage.value = null

  const favCategory = ensureFavoritesCategory()
  
  const exists = favCategory.items.some(i => i.sourceItemId === item.id)
  if (exists) {
    showToast('该项目已在喜欢中', 'warning')
    return
  }
  
  const newItem = {
    id: Date.now(),
    sourceItemId: item.id
  }
  favCategory.items.push(newItem)
  
  saveData()
  showToast(`已添加 "${item.name}" 到喜欢`)
}

const toggleFavorite = (item) => {
  if (isFavoriteItem(item)) {
    removeFromFavorites(item)
  } else {
    addToFavorites(item)
  }
}

// 从喜欢中移除
const removeFromFavorites = (item) => {
  closeActiveMenu()
  activeItemMenuInManage.value = null

  const favCategory = favoriteCategory.value
  if (!favCategory) return
  
  const index = favCategory.items.findIndex(i =>
    i.id === item.id ||
    i.id === item.favoriteId ||
    i.sourceItemId === item.id ||
    i.sourceItemId === item.sourceItemId
  )
  if (index !== -1) {
    favCategory.items.splice(index, 1)
    saveData()
    showToast(`已取消喜欢 "${item.name}"`)
  }
}

// 显示添加对话框
const showAddDialog = (category) => {
  if (category && isFavoritesCategory(category)) {
    category = null
  }

  // 如果没有普通分类且没有指定分类，先创建默认分类
  if (!category && regularCategories.value.length === 0) {
    const defaultCategory = {
      id: 'default-category-' + Date.now(),
      name: '默认分类',
      parentId: null,
      collapsed: false,
      items: []
    }
    categories.value.push(defaultCategory)
    saveData()
    category = defaultCategory
  }
  
  dialog.value = {
    visible: true,
    mode: 'add',
    targetCategory: category,
    editingItem: null,
    form: {
      name: '',
      categoryId: category ? category.id : (orderedRegularCategories.value[0] ? orderedRegularCategories.value[0].id : ''),
      internalUrl: '',
      externalUrl: '',
      note: '',
      iconUrl: '',
      icon: '🌐'
    }
  }
}

// 编辑项目
const editItem = (item) => {
  const category = findCategoryByItemId(item.id)
  if (!category) {
    return
  }
  dialog.value = {
    visible: true,
    mode: 'edit',
    targetCategory: category,
    editingItem: item,
    form: {
      name: item.name,
      categoryId: category.id,
      internalUrl: item.internalUrl || '',
      externalUrl: item.externalUrl || '',
      note: item.note || '',
      iconUrl: item.iconUrl || '',
      icon: item.icon || '🌐'
    }
  }
  closeActiveMenu()
  activeItemMenuInManage.value = null
}

// 删除项目
const deleteItem = (item) => {
  closeActiveMenu()
  if (confirm(`确定要删除 "${item.name}" 吗？`)) {
    const favCategory = favoriteCategory.value
    categories.value.forEach(category => {
      const index = category.items.findIndex(i => i.id === item.id)
      if (index !== -1) {
        category.items.splice(index, 1)
      }
    })
    if (favCategory) {
      favCategory.items = favCategory.items.filter(i => i.sourceItemId !== item.id)
    }
    saveData()
  }
}

// 保存项目
const saveItem = () => {
  if (!dialog.value.form.name.trim()) {
    showToast('请输入名称', 'warning')
    return
  }

  if (!dialog.value.form.internalUrl.trim() && !dialog.value.form.externalUrl.trim()) {
    showToast('请至少输入一个网址（内网或外网）', 'warning')
    return
  }

  if (dialog.value.mode === 'add') {
    // 添加新项
    const category = categories.value.find(c => c.id === dialog.value.form.categoryId)
    if (category) {
      const newItem = {
        id: Date.now(),
        name: dialog.value.form.name,
        internalUrl: dialog.value.form.internalUrl,
        externalUrl: dialog.value.form.externalUrl,
        note: dialog.value.form.note,
        iconUrl: dialog.value.form.iconUrl,
        icon: dialog.value.form.icon || '🌐'
      }
      category.items.push(newItem)
    }
  } else {
    // 编辑现有项
    const oldCategory = categories.value.find(c => c.items.some(i => i.id === dialog.value.editingItem.id))
    const newCategory = categories.value.find(c => c.id === dialog.value.form.categoryId)
    
    if (oldCategory && newCategory) {
      const itemIndex = oldCategory.items.findIndex(i => i.id === dialog.value.editingItem.id)
      if (itemIndex !== -1) {
        const updatedItem = {
          ...oldCategory.items[itemIndex],
          name: dialog.value.form.name,
          internalUrl: dialog.value.form.internalUrl,
          externalUrl: dialog.value.form.externalUrl,
          note: dialog.value.form.note,
          iconUrl: dialog.value.form.iconUrl,
          icon: dialog.value.form.icon || '🌐'
        }
        if (updatedItem.healthCheck != null) {
          delete updatedItem.healthCheck
        }

        // 如果分类改变，需要移动项目
        if (oldCategory.id !== newCategory.id) {
          oldCategory.items.splice(itemIndex, 1)
          newCategory.items.push(updatedItem)
        } else {
          oldCategory.items[itemIndex] = updatedItem
        }
      }
    }
  }

  saveData()
  closeDialog()
}

// 关闭对话框
const closeDialog = () => {
  dialog.value.visible = false
}

// 打开系统应用设置
const openSystemSettings = (section = 'category-management') => {
  settingsDialog.value.visible = true
  settingsDialog.value.activeSection = 'category-management'
}

const switchSettingsSection = (section) => {
  settingsDialog.value.activeSection = section
  activeCategoryMenu.value = null
  activeItemMenuInManage.value = null
  importExportMenuVisible.value = false
  resetMenuVisible.value = false
}

// 关闭系统应用设置
const closeSystemSettings = () => {
  settingsDialog.value.visible = false
  activeCategoryMenu.value = null
  activeItemMenuInManage.value = null
  importExportMenuVisible.value = false
  resetMenuVisible.value = false
}

// 切换分类菜单
const toggleCategoryMenu = (categoryId) => {
  const category = categories.value.find(c => c.id === categoryId)
  if (category && isFavoritesCategory(category)) {
    activeCategoryMenu.value = null
    return
  }
  if (activeCategoryMenu.value === categoryId) {
    activeCategoryMenu.value = null
  } else {
    activeCategoryMenu.value = categoryId
    activeItemMenuInManage.value = null
    hideUrlTooltip()
  }
}

// 切换项目菜单（在管理界面中）
const toggleItemMenuInManage = (itemId) => {
  if (activeItemMenuInManage.value === itemId) {
    activeItemMenuInManage.value = null
  } else {
    activeItemMenuInManage.value = itemId
    closeActiveMenu()
    activeCategoryMenu.value = null
    hideUrlTooltip()
  }
}

const focusCategoryNameInput = () => {
  setTimeout(() => {
    if (categoryNameInput.value) {
      categoryNameInput.value.focus()
    }
  }, 100)
}

const moveCategoryWithinSiblings = (category, direction) => {
  const parentId = normalizeParentId(category.parentId)
  const siblingIndexes = []

  categories.value.forEach((currentCategory, index) => {
    if (
      !isFavoritesCategory(currentCategory) &&
      normalizeParentId(currentCategory.parentId) === parentId
    ) {
      siblingIndexes.push(index)
    }
  })

  const currentPosition = siblingIndexes.findIndex(index => categories.value[index].id === category.id)
  if (currentPosition === -1) {
    return false
  }

  const targetPosition = currentPosition + direction
  if (targetPosition < 0 || targetPosition >= siblingIndexes.length) {
    return false
  }

  const sourceIndex = siblingIndexes[currentPosition]
  const targetIndex = siblingIndexes[targetPosition]
  const [movedCategory] = categories.value.splice(sourceIndex, 1)
  const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
  categories.value.splice(adjustedTargetIndex, 0, movedCategory)
  return true
}

// 添加新分类
const addNewCategory = (parentCategory = null) => {
  categoryFormDialog.value = {
    visible: true,
    mode: 'add',
    editingCategory: null,
    form: {
      name: '',
      icon: '',
      parentId: parentCategory ? parentCategory.id : null
    }
  }
  focusCategoryNameInput()
}

// 保存分类表单
const saveCategoryForm = () => {
  if (!categoryFormDialog.value.form.name.trim()) {
    showToast('请输入分类名称', 'warning')
    return
  }

  if (categoryFormDialog.value.mode === 'add') {
    // 添加新分类
    const newId = 'category-' + Date.now()
    categories.value.push({
      id: newId,
      name: categoryFormDialog.value.form.name.trim(),
      parentId: normalizeParentId(categoryFormDialog.value.form.parentId),
      collapsed: false,
      items: []
    })
    showToast(`已添加分类 "${categoryFormDialog.value.form.name.trim()}"`)
  } else {
    // 编辑分类
    const category = categoryFormDialog.value.editingCategory
    if (category) {
      category.name = categoryFormDialog.value.form.name.trim()
      category.parentId = normalizeParentId(categoryFormDialog.value.form.parentId)
      category.icon = categoryFormDialog.value.form.icon || ''
      showToast(`已更新分类 "${category.name}"`)
    }
  }

  saveData()
  closeCategoryFormDialog()
}

// 关闭分类表单对话框
const closeCategoryFormDialog = () => {
  categoryFormDialog.value.visible = false
}

// 编辑分类名称
const editCategoryName = (category) => {
  activeCategoryMenu.value = null
  categoryFormDialog.value = {
    visible: true,
    mode: 'edit',
    editingCategory: category,
    form: {
      name: category.name,
      icon: category.icon || '',
      parentId: normalizeParentId(category.parentId)
    }
  }
  setTimeout(() => {
    if (categoryNameInput.value) {
      categoryNameInput.value.focus()
      categoryNameInput.value.select()
    }
  }, 100)
}

// 删除分类
const deleteCategory = (category) => {
  activeCategoryMenu.value = null
  const subtreeIds = new Set(collectSubtreeCategoryIds(category.id))
  const subtreeCategories = orderedRegularCategories.value.filter(item => subtreeIds.has(item.id))
  const itemCount = subtreeCategories.reduce((total, currentCategory) => total + currentCategory.items.length, 0)
  const categoryCount = subtreeCategories.length

  if (itemCount > 0) {
    if (!confirm(`分类 "${category.name}" 及其子分类中还有 ${itemCount} 个项目，确定要删除吗？`)) {
      return
    }
  } else if (categoryCount > 1) {
    if (!confirm(`分类 "${category.name}" 下还有 ${categoryCount - 1} 个子分类，确定要删除整个分类树吗？`)) {
      return
    }
  }

  categories.value = categories.value.filter(currentCategory => !subtreeIds.has(currentCategory.id))
  saveData()
}

// 上移分类
const moveCategoryUp = (index) => {
  activeCategoryMenu.value = null
  const category = orderedRegularCategories.value[index]
  if (category && moveCategoryWithinSiblings(category, -1)) {
    saveData()
  }
}

// 下移分类
const moveCategoryDown = (index) => {
  activeCategoryMenu.value = null
  const category = orderedRegularCategories.value[index]
  if (category && moveCategoryWithinSiblings(category, 1)) {
    saveData()
  }
}

const setTooltipPosition = (rect, tooltipData) => {
  const tooltipWidth = Math.min(360, window.innerWidth - 24)
  const tooltipHeight = 160 // 估算 tooltip 高度
  const padding = 12
  const preferredX = rect.left + rect.width / 2
  const minX = padding + tooltipWidth / 2
  const maxX = window.innerWidth - padding - tooltipWidth / 2
  const x = Math.max(minX, Math.min(preferredX, maxX))

  // 获取面板实际可视区域顶部（header + function-bar 之下）
  const panelEl = document.querySelector('.navigation-panel .content')
  const panelTop = panelEl ? panelEl.getBoundingClientRect().top : 0
  const preferredTopY = rect.top - 12
  // 如果 tooltip 向上显示会被顶部遮挡，则改为向下显示
  const placement = (preferredTopY - tooltipHeight) < panelTop ? 'bottom' : 'top'
  const y = placement === 'top' ? preferredTopY : rect.bottom + 12

  urlTooltip.value = {
    visible: true,
    placement,
    x,
    y,
    ...tooltipData
  }
}

// 显示 URL 提示
const showUrlTooltip = (item, event) => {
  if (activeMenu.value) return
  const rect = event.currentTarget.getBoundingClientRect()
  setTooltipPosition(rect, {
    mode: networkMode.value === 'internal' ? '当前模式：内网模式' : '当前模式：外网模式',
    internalUrl: item.internalUrl || '未设置',
    externalUrl: item.externalUrl || '未设置',
    note: item.note || ''
  })
}

// 隐藏 URL 提示
const hideUrlTooltip = () => {
  urlTooltip.value.visible = false
}

// 显示管理项目的 URL 提示
const showManageItemTooltip = (item, event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  setTooltipPosition(rect, {
    mode: networkMode.value === 'internal' ? '当前模式：内网模式' : '当前模式：外网模式',
    internalUrl: item.internalUrl || '未设置',
    externalUrl: item.externalUrl || '未设置',
    note: item.note || ''
  })
}

// 显示重置菜单
const showResetMenu = () => {
  // 清除定时器
  if (resetMenuCloseTimer) {
    clearTimeout(resetMenuCloseTimer)
    resetMenuCloseTimer = null
  }
  resetMenuVisible.value = !resetMenuVisible.value
  importExportMenuVisible.value = false
}

// 显示导入导出菜单
const showImportExportMenu = () => {
  // 清除定时器
  if (importExportMenuCloseTimer) {
    clearTimeout(importExportMenuCloseTimer)
    importExportMenuCloseTimer = null
  }
  importExportMenuVisible.value = !importExportMenuVisible.value
  resetMenuVisible.value = false
}

const openExportDataDialog = () => {
  importExportMenuVisible.value = false
  exportDataDialog.value.visible = true
}

const closeExportDataDialog = () => {
  exportDataDialog.value.visible = false
}

const confirmExportData = (format) => {
  closeExportDataDialog()
  exportData(format)
}

// 处理菜单鼠标进入事件
const handleMenuMouseEnter = (menuType) => {
  if (menuType === 'reset' && resetMenuCloseTimer) {
    clearTimeout(resetMenuCloseTimer)
    resetMenuCloseTimer = null
  } else if (menuType === 'importExport' && importExportMenuCloseTimer) {
    clearTimeout(importExportMenuCloseTimer)
    importExportMenuCloseTimer = null
  }
}

// 处理菜单鼠标离开事件
const handleMenuMouseLeave = (menuType) => {
  if (menuType === 'reset') {
    if (resetMenuCloseTimer) {
      clearTimeout(resetMenuCloseTimer)
    }
    resetMenuCloseTimer = setTimeout(() => {
      resetMenuVisible.value = false
    }, 500)
  } else if (menuType === 'importExport') {
    if (importExportMenuCloseTimer) {
      clearTimeout(importExportMenuCloseTimer)
    }
    importExportMenuCloseTimer = setTimeout(() => {
      importExportMenuVisible.value = false
    }, 500)
  }
}

// 重置为默认数据
const resetToDefault = () => {
  resetMenuVisible.value = false
  if (confirm('确定要重置为默认数据吗？当前所有数据将被覆盖！')) {
    // 加载默认数据
    categories.value = JSON.parse(JSON.stringify(defaultData))
    saveData()
    showToast('已重置为默认数据')
  }
}

// 清空所有数据
const clearAllData = () => {
  resetMenuVisible.value = false
  if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    if (confirm('再次确认：真的要清空所有分类和网址吗？')) {
      categories.value = []
      saveData()  // 保存空数组到本地存储
      showToast('已清空所有数据')
      // 不需要重新加载页面，数据已更新
    }
  }
}

// 导出数据
const escapeHtml = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const appendBookmarkNodes = (htmlParts, nodes, urlField, timestamp, indentLevel = 1) => {
  const indent = '  '.repeat(indentLevel)

  nodes.forEach(node => {
    if (node.type === 'folder') {
      htmlParts.push(`${indent}<DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${escapeHtml(node.title)}</H3>`)
      htmlParts.push(`${indent}<DL><p>`)
      appendBookmarkNodes(htmlParts, node.children, urlField, timestamp, indentLevel + 1)
      htmlParts.push(`${indent}</DL><p>`)
      return
    }

    htmlParts.push(`${indent}<DT><A HREF="${escapeHtml(node.url)}" ADD_DATE="${timestamp}">${escapeHtml(node.name || node.url)}</A>`)
    if (node.note) {
      htmlParts.push(`${indent}<DD>${escapeHtml(node.note)}`)
    }
  })
}

const buildBookmarkTree = (urlField) => {
  const tree = []
  const nodeMap = new Map()

  orderedRegularCategories.value.forEach(category => {
    const items = Array.isArray(category.items)
      ? category.items
          .filter(item => item?.[urlField])
          .map(item => ({
            type: 'bookmark',
            name: item.name,
            url: item[urlField],
            note: item.note || ''
          }))
      : []

    if (items.length === 0) {
      return
    }

    const pathCategories = getCategoryPathCategories(category)
    let currentLevel = tree

    pathCategories.forEach(pathCategory => {
      const nodeKey = `${urlField}:${pathCategory.id}`
      let folderNode = nodeMap.get(nodeKey)

      if (!folderNode) {
        folderNode = {
          type: 'folder',
          id: pathCategory.id,
          title: pathCategory.name,
          children: []
        }
        nodeMap.set(nodeKey, folderNode)
        currentLevel.push(folderNode)
      }

      currentLevel = folderNode.children
    })

    currentLevel.push(...items)
  })

  return tree
}

const buildBrowserBookmarkHtml = () => {
  const timestamp = Math.floor(Date.now() / 1000)
  const networkGroups = [
    { title: '内网', key: 'internalUrl' },
    { title: '外网', key: 'externalUrl' }
  ]

  const folderParts = []

  networkGroups.forEach(group => {
    const tree = buildBookmarkTree(group.key)
    if (tree.length === 0) {
      return
    }

    folderParts.push(`  <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${group.title}</H3>`)
    folderParts.push('  <DL><p>')
    appendBookmarkNodes(folderParts, tree, group.key, timestamp, 2)
    folderParts.push('  </DL><p>')
  })

  if (folderParts.length === 0) {
    return ''
  }

  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${folderParts.join('\n')}
</DL><p>
`
}

const exportData = (format) => {
  importExportMenuVisible.value = false
  
  try {
    if (format === 'json') {
      // JSON 格式 - 导出完整的分类结构（与 default-data.json 格式一致）
      const dataStr = JSON.stringify(categories.value, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const filename = `navigation-data-${Date.now()}.json`
      
      downloadBlob(blob, filename)
      
      showToast(`已导出 ${categories.value.length} 个分类`)
      return
    }

    if (format === 'browser-bookmarks') {
      const bookmarkHtml = buildBrowserBookmarkHtml()
      if (!bookmarkHtml) {
        showToast('没有可导出的书签数据', 'warning')
        return
      }

      const blob = new Blob([bookmarkHtml], { type: 'text/html;charset=utf-8;' })
      const filename = `browser-bookmarks-${Date.now()}.html`
      downloadBlob(blob, filename)
      showToast('已导出兼容浏览器的书签 HTML')
      return
    }
    
    // Excel 和 HTML 格式 - 导出扁平化数据
    const exportItems = []
    orderedRegularCategories.value.forEach(category => {
      category.items.forEach(item => {
        exportItems.push({
          name: item.name,
          category: formatCategoryPath(category),
          internalUrl: item.internalUrl || '',
          externalUrl: item.externalUrl || '',
          note: item.note || '',
          iconUrl: item.iconUrl || ''
        })
      })
    })
    
    if (exportItems.length === 0) {
      showToast('没有可导出的数据', 'warning')
      return
    }
    
    let blob, filename
    
    if (format === 'excel') {
      // Excel 格式 (CSV)
      let csvContent = '\uFEFF' // UTF-8 BOM
      csvContent += '名称,分类,内网地址,外网地址,备注,图标URL\n'
      exportItems.forEach(item => {
        csvContent += `"${item.name}","${item.category}","${item.internalUrl}","${item.externalUrl}","${item.note}","${item.iconUrl}"\n`
      })
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      filename = `navigation-data-${Date.now()}.csv`
    } else if (format === 'html') {
      // HTML 格式
      let htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>导航数据</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #ff9800; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    tr:hover { background-color: #e0e0e0; }
    a { color: #ff9800; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>导航数据 (${exportItems.length} 条)</h1>
  <table>
    <thead>
      <tr>
        <th>名称</th>
        <th>分类</th>
        <th>内网地址</th>
        <th>外网地址</th>
        <th>备注</th>
        <th>图标URL</th>
      </tr>
    </thead>
    <tbody>
`
      exportItems.forEach(item => {
        htmlContent += `      <tr>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${item.internalUrl ? `<a href="${item.internalUrl}" target="_blank">${item.internalUrl}</a>` : ''}</td>
        <td>${item.externalUrl ? `<a href="${item.externalUrl}" target="_blank">${item.externalUrl}</a>` : ''}</td>
        <td>${item.note || ''}</td>
        <td>${item.iconUrl ? `<a href="${item.iconUrl}" target="_blank">查看</a>` : ''}</td>
      </tr>
`
      })
      htmlContent += `    </tbody>
  </table>
</body>
</html>`
      blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
      filename = `navigation-data-${Date.now()}.html`
    }
    
    // 下载文件
    downloadBlob(blob, filename)
    
    showToast(`已导出 ${exportItems.length} 条数据为 ${format.toUpperCase()} 格式`)
  } catch (e) {
    console.error('导出失败:', e)
    showToast('导出失败: ' + e.message, 'error')
  }
}

// 导入数据（触发文件选择器）
const importData = () => {
  importExportMenuVisible.value = false
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// 导入浏览器HTML文件
const importBrowserHtml = () => {
  importExportMenuVisible.value = false
  browserImportDialog.value = {
    visible: true,
    fileName: '',
    fileSize: 0,
    fileContent: '',
    mode: 'internal', // 'internal' 或 'external'
    defaultCategory: '',
    newCategoryName: '',
    processing: false,
    parseResult: null
  }
}

// 触发浏览器文件输入
const triggerBrowserFileInput = () => {
  if (browserFileInput.value) {
    browserFileInput.value.click()
  }
}

// 处理浏览器文件选择
const handleBrowserFileSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const fileExt = file.name.split('.').pop().toLowerCase()
  if (fileExt !== 'html' && fileExt !== 'htm') {
    showToast('请选择HTML文件', 'warning')
    return
  }
  
  browserImportDialog.value.fileName = file.name
  browserImportDialog.value.fileSize = file.size
  
  // 读取文件内容并解析
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      browserImportDialog.value.fileContent = e.target.result
      const parseResult = parseBrowserHtml(e.target.result)
      browserImportDialog.value.parseResult = parseResult
    } catch (error) {
      console.error('解析HTML文件失败:', error)
      showToast('解析HTML文件失败: ' + error.message, 'error')
    }
  }
  reader.readAsText(file, 'UTF-8')
  
  // 清空文件输入
  event.target.value = ''
}

// 处理浏览器文件拖放
const handleBrowserFileDrop = (event) => {
  event.preventDefault()
  
  const files = event.dataTransfer.files
  if (files.length === 0) return
  
  const file = files[0]
  const fileExt = file.name.split('.').pop().toLowerCase()
  if (fileExt !== 'html' && fileExt !== 'htm') {
    showToast('请拖放HTML文件', 'warning')
    return
  }
  
  // 创建模拟的FileInput事件
  const mockEvent = {
    target: {
      files: [file]
    }
  }
  handleBrowserFileSelect(mockEvent)
}

// 清除浏览器文件
const clearBrowserFile = () => {
  browserImportDialog.value.fileName = ''
  browserImportDialog.value.fileSize = 0
  browserImportDialog.value.fileContent = ''
  browserImportDialog.value.parseResult = null
  if (browserFileInput.value) {
    browserFileInput.value.value = ''
  }
}

// 关闭浏览器导入对话框
const closeBrowserImportDialog = () => {
  browserImportDialog.value.visible = false
  clearBrowserFile()
}

// 解析浏览器HTML文件
const parseBrowserHtml = (htmlContent) => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')
    const bookmarks = []
    const folders = new Set()

    const normalizeBookmarkText = (value, fallback = '') => {
      return String(value || fallback)
        .trim()
        .replace(/[\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
    }

    const walkBookmarkDl = (dlElement, currentPath = []) => {
      Array.from(dlElement.children).forEach(child => {
        if (child.tagName !== 'DT') {
          return
        }

        const folderHeader = Array.from(child.children).find(element => /^H[1-6]$/i.test(element.tagName))
        const linkElement = Array.from(child.children).find(element => element.tagName === 'A')

        if (folderHeader) {
          const folderName = normalizeBookmarkText(folderHeader.textContent, '导入的书签')
          const nestedDl = Array.from(child.children).find(element => element.tagName === 'DL') || child.querySelector(':scope > DL')
          if (nestedDl) {
            walkBookmarkDl(nestedDl, [...currentPath, folderName])
          }
          return
        }

        if (!linkElement) {
          return
        }

        const url = linkElement.getAttribute('href')
        const name = normalizeBookmarkText(linkElement.textContent, url)

        if (!name || !url || url.startsWith('javascript:') || url.startsWith('about:')) {
          return
        }

        const folderPath = currentPath.length > 0 ? currentPath : ['导入的书签']
        bookmarks.push({
          name,
          url,
          folder: folderPath[folderPath.length - 1],
          folderPath
        })
        folders.add(folderPath.join(' / '))
      })
    }

    const rootDl = doc.querySelector('DL')
    if (rootDl) {
      walkBookmarkDl(rootDl, [])
    } else {
      const links = doc.querySelectorAll('a')
      links.forEach(link => {
        const url = link.getAttribute('href')
        const name = normalizeBookmarkText(link.textContent, url)
        if (!name || !url || url.startsWith('javascript:') || url.startsWith('about:')) {
          return
        }
        bookmarks.push({
          name,
          url,
          folder: '导入的书签',
          folderPath: ['导入的书签']
        })
        folders.add('导入的书签')
      })
    }
    
    // 检查现有数据中的重复项
    const existingItems = []
    orderedRegularCategories.value.forEach(category => {
      category.items.forEach(item => {
        if (item.name) {
          existingItems.push(item.name.toLowerCase())
        }
      })
    })
    
    let duplicates = 0
    let newItems = 0
    const bookmarksToAdd = []
    const existingNamesSet = new Set(existingItems)
    
    bookmarks.forEach(bookmark => {
      const nameLower = bookmark.name.toLowerCase()
      if (existingNamesSet.has(nameLower)) {
        duplicates++
        bookmarksToAdd.push({...bookmark, isDuplicate: true})
      } else {
        newItems++
        bookmarksToAdd.push({...bookmark, isDuplicate: false})
      }
    })
    
    return {
      bookmarks: bookmarksToAdd,
      folders: Array.from(folders),
      duplicates,
      newItems
    }
  } catch (error) {
    console.error('解析浏览器HTML失败:', error)
    throw new Error('无法解析浏览器书签文件')
  }
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const findCategoryByNameAndParent = (name, parentId = null) => {
  const normalizedParentId = normalizeParentId(parentId)
  return orderedRegularCategories.value.find(category =>
    category.name === name && normalizeParentId(category.parentId) === normalizedParentId
  ) || null
}

const ensureCategoryPath = (pathNames) => {
  const normalizedPath = Array.isArray(pathNames) ? pathNames.filter(Boolean) : []
  let parentId = null
  let targetCategory = null

  normalizedPath.forEach(name => {
    let category = findCategoryByNameAndParent(name, parentId)
    if (!category) {
      category = {
        id: 'category-' + Date.now() + Math.random(),
        name,
        parentId,
        collapsed: false,
        items: []
      }
      categories.value.push(category)
    }
    targetCategory = category
    parentId = category.id
  })

  return targetCategory
}

// 处理浏览器导入
const processBrowserImport = async () => {
  try {
    if (!browserImportDialog.value.fileContent || !browserImportDialog.value.parseResult) {
      showToast('请先选择有效的书签文件', 'warning')
      return
    }
    
    browserImportDialog.value.processing = true
    
    const { bookmarks, folders } = browserImportDialog.value.parseResult
    const importMode = browserImportDialog.value.mode // 'internal' 或 'external'
    const defaultCategoryId = browserImportDialog.value.defaultCategory

    if (bookmarks.length > IMPORT_ITEM_LIMIT) {
      showToast(`浏览器书签超过限制！最多支持 ${IMPORT_ITEM_LIMIT} 条，当前 ${bookmarks.length} 条`, 'warning')
      return
    }
    
    // 统计数据
    let addedCount = 0
    let updatedCount = 0
    
    // 处理每个书签
    for (const bookmark of bookmarks) {
      const { name, url, folder, folderPath, isDuplicate } = bookmark
      
      // 确定要使用的分类
      let targetCategory
      if (defaultCategoryId === '') {
        // 自动创建分类（使用文件夹层级）
        targetCategory = ensureCategoryPath(folderPath && folderPath.length > 0 ? folderPath : [folder || '导入的书签'])
      } else if (defaultCategoryId === 'new') {
        // 使用新创建的分类
        const newCategoryName = browserImportDialog.value.newCategoryName || '导入的书签'
        targetCategory = ensureCategoryPath([newCategoryName, ...(folderPath && folderPath.length > 0 ? folderPath : [folder || '导入的书签'])])
      } else {
        // 使用现有分类
        const baseCategory = getRegularCategoryById(defaultCategoryId)
        if (baseCategory) {
          const basePath = getCategoryPathNames(baseCategory)
          targetCategory = ensureCategoryPath([...basePath, ...(folderPath && folderPath.length > 0 ? folderPath : [folder || '导入的书签'])])
        }
      }
      
      if (!targetCategory) {
        console.warn(`无法找到或创建分类: ${folder || '导入的书签'}`)
        continue
      }
      
      // 检查是否已存在同名书签
      const existingItemIndex = targetCategory.items.findIndex(item => 
        item.name.toLowerCase() === name.toLowerCase()
      )
      
      if (existingItemIndex !== -1 && isDuplicate) {
        // 更新现有书签
        const existingItem = targetCategory.items[existingItemIndex]
        if (importMode === 'internal') {
          // 设置为内网地址，外网地址保持不变
          targetCategory.items[existingItemIndex] = {
            ...existingItem,
            internalUrl: url,
            externalUrl: existingItem.externalUrl // 保持外网地址不变
          }
        } else {
          // 设置为外网地址，内网地址保持不变
          targetCategory.items[existingItemIndex] = {
            ...existingItem,
            internalUrl: existingItem.internalUrl, // 保持内网地址不变
            externalUrl: url
          }
        }
        updatedCount++
      } else {
        // 添加新书签
        const newItem = {
          id: Date.now() + Math.random(),
          name: name,
          iconUrl: '',
          icon: '🌐',
          note: '',
          internalUrl: importMode === 'internal' ? url : '',
          externalUrl: importMode === 'external' ? url : ''
        }
        targetCategory.items.push(newItem)
        addedCount++
      }
    }
    
    // 保存数据
    saveData()
    
    // 显示导入结果
    const totalCount = addedCount + updatedCount
    const message = `浏览器书签导入完成！\n
已添加 ${addedCount} 个新书签\n
已更新 ${updatedCount} 个存在的书签\n
总计处理 ${totalCount} 个书签\n
导入模式：${importMode === 'internal' ? '内网地址' : '外网地址'}\n
分类数量：${folders.length} 个`
    
    // 关闭对话框
    closeBrowserImportDialog()
    
    // 显示结果
    setTimeout(() => {
      showToast(message)
    }, 100)
    
  } catch (error) {
    console.error('处理浏览器导入失败:', error)
    showToast('导入失败: ' + error.message, 'error')
  } finally {
    browserImportDialog.value.processing = false
  }
}

// 处理文件导入
const handleFileImport = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const fileExt = file.name.split('.').pop().toLowerCase()
  
  if (fileExt === 'json') {
    // JSON 格式 - 支持两种格式
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        
        if (!Array.isArray(data)) {
          showToast('导入文件格式错误：数据必须是数组', 'error')
          return
        }
        
        // 检测是完整格式还是扁平格式
        if (data.length > 0 && data[0].hasOwnProperty('items')) {
          // 完整格式（与 default-data.json 一致）
          const totalItems = data.reduce((total, category) => total + (Array.isArray(category.items) ? category.items.length : 0), 0)
          if (totalItems > IMPORT_ITEM_LIMIT) {
            showToast(`导入数据超过限制！最多支持 ${IMPORT_ITEM_LIMIT} 条，当前 ${totalItems} 条`, 'warning')
            return
          }

          if (confirm(`检测到完整分类数据格式，共 ${data.length} 个分类。是否直接替换当前所有数据？`)) {
            categories.value = data
            saveData()
            showToast(`已导入 ${data.length} 个分类`)
          }
        } else {
          // 扁平格式（旧的导出格式）
          processImportData(data)
        }
      } catch (e) {
        console.error('导入失败:', e)
        showToast('导入失败: ' + e.message, 'error')
      }
    }
    reader.readAsText(file, 'UTF-8')
  } else if (fileExt === 'csv' || fileExt === 'xlsx' || fileExt === 'xls') {
    // Excel/CSV 格式 - 使用二进制读取
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        let text = ''
        
        // 尝试多种编码解码
        try {
          // 尝试 UTF-8
          const decoder = new TextDecoder('utf-8')
          text = decoder.decode(data)
        } catch (err) {
          // 尝试 GBK (中文 Windows 默认编码)
          try {
            const decoder = new TextDecoder('gbk')
            text = decoder.decode(data)
          } catch (err2) {
            // 最后尝试 GB2312
            const decoder = new TextDecoder('gb2312')
            text = decoder.decode(data)
          }
        }
        
        const importItems = []
        const lines = text.split(/\r?\n/)
        
        // 跳过标题行，从第二行开始
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue
          
          // 更强大的 CSV 解析（支持引号内的逗号）
          const values = []
          let current = ''
          let inQuotes = false
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j]
            if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          values.push(current.trim())
          
          // 至少需要 5 列数据
          if (values.length >= 5) {
            importItems.push({
              name: values[0].replace(/^"|"$/g, ''),
              category: values[1].replace(/^"|"$/g, ''),
              internalUrl: values[2].replace(/^"|"$/g, ''),
              externalUrl: values[3].replace(/^"|"$/g, ''),
              note: values.length >= 6 ? values[4].replace(/^"|"$/g, '') : '',
              iconUrl: values.length >= 6 ? values[5].replace(/^"|"$/g, '') : values[4].replace(/^"|"$/g, '')
            })
          }
        }
        
        processImportData(importItems)
      } catch (e) {
        console.error('导入失败:', e)
        showToast('导入失败: ' + e.message, 'error')
      }
    }
    reader.readAsArrayBuffer(file)
  } else if (fileExt === 'html') {
    // HTML 格式
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importItems = []
        const parser = new DOMParser()
        const doc = parser.parseFromString(e.target.result, 'text/html')
        const rows = doc.querySelectorAll('tbody tr')
        rows.forEach(row => {
          const cells = row.querySelectorAll('td')
          if (cells.length >= 5) {
            importItems.push({
              name: cells[0].textContent.trim(),
              category: cells[1].textContent.trim(),
              internalUrl: cells[2].querySelector('a')?.href || cells[2].textContent.trim(),
              externalUrl: cells[3].querySelector('a')?.href || cells[3].textContent.trim(),
              note: cells.length >= 6 ? cells[4].textContent.trim() : '',
              iconUrl: cells.length >= 6
                ? (cells[5].querySelector('a')?.href || cells[5].textContent.trim())
                : (cells[4].querySelector('a')?.href || cells[4].textContent.trim())
            })
          }
        })
        processImportData(importItems)
      } catch (e) {
        console.error('导入失败:', e)
        showToast('导入失败: ' + e.message, 'error')
      }
    }
    reader.readAsText(file, 'UTF-8')
  } else {
    showToast('不支持的文件格式', 'warning')
    return
  }
  
  // 清空文件输入
  event.target.value = ''
}

// 处理导入数据的通用函数
const processImportData = (importItems) => {
  try {
    // 检查数据条数限制
    if (importItems.length > IMPORT_ITEM_LIMIT) {
      showToast(`数据超过限制！最多支持 ${IMPORT_ITEM_LIMIT} 条，当前 ${importItems.length} 条`, 'warning')
      return
    }
    
    // 验证数据格式
    const validItems = importItems.filter(item => {
      return item.name && item.category && (item.internalUrl || item.externalUrl)
    })
    
    if (validItems.length === 0) {
      showToast('没有有效的数据可导入', 'warning')
      return
    }
    
    if (validItems.length < importItems.length) {
      if (!confirm(`有 ${importItems.length - validItems.length} 条数据格式不正确将被忽略，是否继续导入？`)) {
        return
      }
    }
    
    // 按分类组织数据
    const categoryMap = new Map()
    validItems.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, [])
      }
      categoryMap.get(item.category).push({
        id: Date.now() + Math.random(),
        name: item.name,
        internalUrl: item.internalUrl || '',
        externalUrl: item.externalUrl || '',
        note: item.note || '',
        iconUrl: item.iconUrl || '',
        icon: '🌐'
      })
    })
    
    // 创建或更新分类
    categoryMap.forEach((items, categoryName) => {
      let category = categories.value.find(c => c.name === categoryName)
      if (!category) {
        category = {
          id: 'category-' + Date.now() + Math.random(),
          name: categoryName,
          collapsed: false,
          items: []
        }
        categories.value.push(category)
      }
      category.items.push(...items)
    })
    
    saveData()
    showToast(`成功导入 ${validItems.length} 条数据`)
  } catch (e) {
    console.error('处理导入数据失败:', e)
    showToast('处理导入数据失败: ' + e.message, 'error')
  }
}

// 刷新数据
const refreshData = () => {
  loadData()
  showToast('数据已刷新')
}

// 图片加载失败处理
const handleImageError = (event) => {
  event.target.style.display = 'none'
}

// 保存数据到本地存储
const flushDataSave = () => {
  if (dataSaveTimer) {
    clearTimeout(dataSaveTimer)
    dataSaveTimer = null
  }

  try {
    const data = JSON.stringify(categories.value)
    localStorage.setItem('navigation-panel-data', data)
  } catch (e) {
    console.error('保存数据失败:', e)
  }
}

const saveData = (options = {}) => {
  const { immediate = false } = options

  if (immediate) {
    flushDataSave()
    return
  }

  if (dataSaveTimer) {
    clearTimeout(dataSaveTimer)
  }

  dataSaveTimer = setTimeout(() => {
    flushDataSave()
  }, 220)
}

// 从本地存储加载数据
const loadData = () => {
  try {
    const data = localStorage.getItem('navigation-panel-data')
    if (data) {
      const loaded = JSON.parse(data)
      categories.value = normalizeCategories(loaded)
    } else {
      categories.value = normalizeCategories(JSON.parse(JSON.stringify(defaultData)))
      saveData()
    }
  } catch (e) {
    console.error('加载数据失败:', e)
    categories.value = normalizeCategories(JSON.parse(JSON.stringify(defaultData)))
  }
}

// ============================================================
// 【新增功能 8】服务连通性检测 —— 运行时逻辑
// 严格约束：只新增，不修改任何现有函数/响应式变量。新增变量以 health 为前缀。
// ============================================================

// ---------- 响应式状态 ----------
const healthUiSettings = ref({ ...defaultHealthUiSettings })
// 运行时健康状态：{ [itemId]: { status, latency, lastChecked, lastOnline, httpStatus, errorMsg } }，仅内存，不持久化
const healthStatus = ref({})
// 检测历史：{ [itemId]: [{ status, ts }, ...] }（最多 10 条），仅内存
const healthHistory = ref({})
// 当前正在检测的条目数（用于全局旋转图标）
const healthActiveCount = ref(0)
// 轮询定时器
let healthPollingTimer = null
// "仅看异常"筛选模式
const healthOnlyAbnormalFilter = ref(false)
// 功能总开关
const healthFeatureOn = computed(() => !!healthUiSettings.value.globalEnabled)

// ---------- 设置持久化 ----------
const loadHealthUiSettings = () => {
  try {
    const saved = localStorage.getItem(HEALTH_UI_SETTINGS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // v2 调整默认策略：启动自动检测默认关闭。旧缓存没有版本号时执行一次迁移，避免历史 true 干扰当前默认。
      if (parsed.settingsVersion !== defaultHealthUiSettings.settingsVersion) {
        parsed.autoCheckOnStart = false
        parsed.settingsVersion = defaultHealthUiSettings.settingsVersion
      }
      healthUiSettings.value = { ...defaultHealthUiSettings, ...parsed }
    }
  } catch (e) {
    console.error('加载连通检测设置失败:', e)
  }
}
const saveHealthUiSettings = () => {
  try {
    localStorage.setItem(HEALTH_UI_SETTINGS_STORAGE_KEY, JSON.stringify(healthUiSettings.value))
  } catch (e) {
    console.error('保存连通检测设置失败:', e)
  }
}
watch(healthUiSettings, () => saveHealthUiSettings(), { deep: true })

// ---------- 条目级配置读取 ----------
const healthResolveItemId = (item) => (item && item.sourceItemId != null ? item.sourceItemId : (item ? item.id : null))
const healthGetItemCategory = (item) => {
  const id = healthResolveItemId(item)
  return id != null ? findCategoryByItemId(id) : null
}
const healthGetEffectiveCategoryConfig = (category) => {
  if (!category) return { ...defaultItemHealthCheck }
  const pathCategories = getCategoryPathCategories(category)
  const effective = { ...defaultItemHealthCheck }
  for (const pathCategory of pathCategories) {
    const cfg = pathCategory && pathCategory.healthCheck
    if (!cfg) continue
    if (cfg.enabled === true || cfg.enabled === false) effective.enabled = cfg.enabled
    if (cfg.strategy) effective.strategy = cfg.strategy
    if (cfg.timeout != null) effective.timeout = cfg.timeout
    if (cfg.checkTarget) effective.checkTarget = cfg.checkTarget
  }
  return effective
}
const healthIsCategoryEnabled = (category) => healthGetEffectiveCategoryConfig(category).enabled === true
const getItemHealthCheck = (item) => {
  const cfg = healthGetEffectiveCategoryConfig(healthGetItemCategory(item))
  const timeout = (cfg.timeout != null && !Number.isNaN(Number(cfg.timeout))) ? Number(cfg.timeout) : healthUiSettings.value.defaultTimeout
  return {
    enabled: cfg.enabled === true,
    strategy: cfg.strategy || 'auto',
    timeout,
    checkTarget: cfg.checkTarget || 'follow'
  }
}
// 是否对该条目执行自动/批量检测：全局开关开 + 所属分类（或其父级分类）显式启用。
const isHealthCheckEnabledFor = (item) => {
  if (!healthFeatureOn.value) return false
  return getItemHealthCheck(item).enabled === true
}
const healthGetStatus = (item) => {
  const id = healthResolveItemId(item)
  return id != null ? (healthStatus.value[id] || null) : null
}
// 指示器是否展示：所属分类启用配置或已有运行时结果时显示
const healthIndicatorVisible = (item) => {
  if (!healthFeatureOn.value) return false
  const id = healthResolveItemId(item)
  if (id == null) return false
  return isHealthCheckEnabledFor(item) || healthStatus.value[id] != null
}
const healthIsAbnormalStatus = (status) => status === 'offline' || status === 'timeout' || status === 'unknown' || status === 'reachable-unknown'
const healthIsAbnormalResult = (status) => {
  if (!status || !status.lastChecked) return false
  return healthIsAbnormalStatus(status.status)
}
const healthStatusClassName = (status, result = null) => {
  const checkedResult = result || { status, lastChecked: status === 'offline' || status === 'timeout' ? true : null }
  return healthIsAbnormalResult(checkedResult) && (status === 'unknown' || status === 'reachable-unknown') ? 'health-offline' : `health-${status || 'unknown'}`
}
const healthStatusClass = (item) => {
  const s = healthGetStatus(item)
  if (!s) return 'health-unknown'
  return healthStatusClassName(s.status, s)
}
const isHealthAbnormalFor = (item) => healthIsAbnormalResult(healthGetStatus(item))
const healthStatusText = (item) => {
  const s = healthGetStatus(item)
  if (!s) return '未检测'
  return formatHealthStatusLabel(s.status, s)
}
const formatHealthStatusLabel = (status, result = null) => {
  const map = { online: '在线', offline: '离线', timeout: '超时', checking: '检测中', unknown: result?.lastChecked ? '异常' : '未确认', 'reachable-unknown': '异常' }
  return map[status] || '未确认'
}
const healthLatencyText = (item) => {
  const s = healthGetStatus(item)
  if (!s || s.status !== 'online' || s.latency == null) return ''
  return s.latency + 'ms'
}

// ---------- 目标地址解析 ----------
const isHealthHttpUrl = (url) => /^https?:\/\//i.test(String(url || ''))
const resolveHealthTargets = (item, checkTarget) => {
  const internal = (item && item.internalUrl) || ''
  const external = (item && item.externalUrl) || ''
  let list = []
  const target = checkTarget || 'follow'
  if (target === 'intranet') list = [internal]
  else if (target === 'extranet') list = [external]
  else if (target === 'both') list = [internal, external]
  else list = networkMode.value === 'internal'
    ? [internal || external]
    : [external || internal]
  const seen = new Set()
  const out = []
  for (const u of list) {
    const v = String(u || '').trim()
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

// ---------- Node 探测服务获取 ----------
// 优先 preload 注入的 window.healthServices.probe；其次在 node 环境运行时 require（避开构建期静态分析）
const healthRequireRuntime = (() => {
  try {
    if (typeof window !== 'undefined' && typeof window.require === 'function') return window.require
  } catch (e) {}
  try {
    return new Function('id', 'return (typeof require === "function") ? require(id) : null')
  } catch (e) {
    return null
  }
})()
const getHealthServices = () => {
  // 优先 preload 注入的 Node 探测能力（uTools 环境）
  if (typeof window !== 'undefined' && window.healthServices && typeof window.healthServices.probe === 'function') {
    return { probe: window.healthServices.probe, available: true, kind: 'utools' }
  }
  // 其次尝试运行时 require Node 模块（部分 uTools/调试路径下组件可直接取到）
  try {
    if (typeof healthRequireRuntime === 'function') {
      const http = healthRequireRuntime('node:http') || healthRequireRuntime('http')
      const https = healthRequireRuntime('node:https') || healthRequireRuntime('https')
      const net = healthRequireRuntime('node:net') || healthRequireRuntime('net')
      if (http && https && net) {
        return { probe: (opts) => healthProbeFallback(http, https, net, opts), available: true, kind: 'node' }
      }
    }
  } catch (e) {}
  // 浏览器环境降级：fetch + Image 尽力探测（无法绕过 CORS，仅判断可达性）
  return { probe: healthProbeBrowser, available: true, kind: 'browser' }
}
// 当前探测服务类型（用于 UI 提示：浏览器模式为限制精度）
const healthServiceKind = computed(() => {
  const s = getHealthServices()
  return s.kind || 'browser'
})
// 地址解析（兜底实现内用；preload 内有等价实现）
const parseHealthTarget = (rawUrl) => {
  let s = String(rawUrl || '').trim()
  if (!s) return null
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) s = 'http://' + s
  let u
  try { u = new URL(s) } catch (e) { return null }
  const host = u.hostname
  if (!host) return null
  let port = u.port
  if (!port) {
    if (u.protocol === 'https:') port = '443'
    else if (u.protocol === 'http:') port = '80'
    else port = '80'
  }
  return { host, port: Number(port), protocol: u.protocol, isHttp: u.protocol === 'http:' || u.protocol === 'https:' }
}
const isHealthTlsCertificateError = (err) => {
  const code = err && err.code
  return code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
    code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'CERT_HAS_EXPIRED' ||
    code === 'ERR_TLS_CERT_ALTNAME_INVALID'
}
const resolveHealthHttpStatus = (statusCode) => {
  const code = Number(statusCode)
  if (code === 408 || code === 504) return { status: 'timeout', httpStatus: code, errorMsg: `HTTP ${code}` }
  if (code >= 500) return { status: 'offline', httpStatus: code, errorMsg: `HTTP ${code}` }
  return { status: 'online', httpStatus: code, errorMsg: '' }
}
// 组件内兜底探测实现（与 preload 中算法保持一致）
const healthProbeFallback = (http, https, net, opts) => {
  return new Promise((resolve) => {
    const url = opts && opts.url
    const strategy = (opts && opts.strategy) || 'auto'
    const timeout = Number(opts && opts.timeout) || 5000
    const target = parseHealthTarget(url)
    if (!target) { resolve({ status: 'unknown', latency: null, httpStatus: null, errorMsg: '地址无效' }); return }
    const useHttp = strategy === 'http' || (strategy === 'auto' && target.isHttp)
    if (useHttp) {
      const lib = target.protocol === 'https:' ? https : http
      const started = Date.now()
      let done = false
      const finish = (r) => { if (done) return; done = true; r.latency = Date.now() - started; resolve(r) }
      const runGetFallback = () => {
        try {
          const req2 = lib.request({ method: 'GET', hostname: target.host, port: target.port, path: '/', timeout }, (res2) => {
            res2.resume()
            finish(resolveHealthHttpStatus(res2.statusCode))
          })
          req2.on('error', (err2) => {
            if (isHealthTlsCertificateError(err2)) finish({ status: 'online', httpStatus: null, errorMsg: String(err2.code || 'TLS_CERT_ERROR') })
            else finish({ status: 'offline', httpStatus: null, errorMsg: String((err2 && err2.code) || (err2 && err2.message) || 'GET_ERROR') })
          })
          req2.on('timeout', () => { req2.destroy(); finish({ status: 'timeout', httpStatus: null, errorMsg: 'timeout' }) })
          req2.end()
        } catch (e2) { finish({ status: 'offline', httpStatus: null, errorMsg: String((e2 && e2.message) || e2) }) }
      }
      let req
      try {
        req = lib.request({ method: 'HEAD', hostname: target.host, port: target.port, path: '/', timeout, headers: { 'User-Agent': 'utools-healthcheck/1.0' } }, (res) => {
          res.resume()
          if (res.statusCode === 405) { runGetFallback(); return }
          finish(resolveHealthHttpStatus(res.statusCode))
        })
      } catch (e) { finish({ status: 'offline', httpStatus: null, errorMsg: String((e && e.message) || e) }); return }
      req.on('error', (err) => {
        if (isHealthTlsCertificateError(err)) finish({ status: 'online', httpStatus: null, errorMsg: String(err.code || 'TLS_CERT_ERROR') })
        else if (err && err.code === 'ECONNREFUSED') finish({ status: 'offline', httpStatus: null, errorMsg: 'ECONNREFUSED' })
        else if (err && (err.code === 'ECONNRESET' || err.code === 'EPIPE')) runGetFallback()
        else finish({ status: 'offline', httpStatus: null, errorMsg: String((err && err.code) || (err && err.message) || err) })
      })
      req.on('timeout', () => { req.destroy(); finish({ status: 'timeout', httpStatus: null, errorMsg: 'timeout' }) })
      req.end()
    } else {
      // TCP 端口探测
      const started = Date.now()
      let done = false
      const finish = (r) => { if (done) return; done = true; r.latency = Date.now() - started; resolve(r) }
      try {
        const socket = new net.Socket()
        socket.setTimeout(timeout)
        socket.once('connect', () => { socket.destroy(); finish({ status: 'online', httpStatus: null, errorMsg: '' }) })
        socket.once('error', (err) => {
          if (err && err.code === 'ECONNREFUSED') finish({ status: 'offline', httpStatus: null, errorMsg: 'ECONNREFUSED' })
          else if (err && (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN')) finish({ status: 'offline', httpStatus: null, errorMsg: '域名解析失败' })
          else finish({ status: 'offline', httpStatus: null, errorMsg: String((err && err.code) || err) })
        })
        socket.once('timeout', () => { socket.destroy(); finish({ status: 'timeout', httpStatus: null, errorMsg: 'timeout' }) })
        socket.connect(target.port, target.host)
      } catch (e) { finish({ status: 'offline', httpStatus: null, errorMsg: String((e && e.message) || e) }) }
    }
  })
}

// ---------- 浏览器环境探测适配 ----------
// uTools 环境优先用 preload 注入的 Node probe；浏览器环境无 Node 模块、受 CORS 限制，
// 这里用「no-cors fetch + 多路径 Image 资源加载」综合判断可达性。
// 关键语义修正：fetch no-cors 的 reject 绝大多数是 CORS/网络策略问题，**不等于主机离线**。
// 因此判离线必须满足「多次探测均未得到任何响应」；只要任一探测 resolve(any) 即判 online。
// 超时才是 timeout；仅当 fetch 与所有资源加载都在极短时间内以网络级错误失败时才判 offline。
// 浏览器策略适配：tcp 策略或非 http(s) URL 在浏览器改写为 http 探测端口可达性
const adaptHealthStrategyForBrowser = (rawUrl) => {
  const target = parseHealthTarget(rawUrl)
  if (!target) return { url: rawUrl, strategy: 'http' }
  // 把任意 scheme（mysql://host:3306）改写成 http://host:port，仅探测端口
  const rewritten = `${target.protocol === 'https:' ? 'https' : 'http'}://${target.host}:${target.port}/`
  return { url: rewritten, strategy: 'http' }
}
// no-cors fetch 探测。返回三态：'online'（resolve 或 abort 之外的 reject 但耗时合理，说明主机有响应但被 CORS 拦）、
// 'timeout'（超时）、'reachable-unknown'（reject，不确定性，需二次确认）。
// 关键：no-cors 下 reject 通常是 TypeError "Failed to fetch"，可能源于 CORS preflight 失败或主机不可达，
// 无法直接判离线，仅作为"非确定在线"信号交给资源加载二次确认。
const healthProbeBrowserFetch = (url, timeout) => {
  return new Promise((resolve) => {
    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      if (controller) { try { controller.abort() } catch (e) {} }
      resolve({ status: 'timeout', latency: null, httpStatus: null, errorMsg: 'timeout' })
    }, timeout)
    const started = Date.now()
    const ok = () => { if (settled) return; settled = true; clearTimeout(timer); resolve({ status: 'online', latency: Date.now() - started, httpStatus: null, errorMsg: '' }) }
    const uncertain = (msg) => { if (settled) return; settled = true; clearTimeout(timer); resolve({ status: 'reachable-unknown', latency: Date.now() - started, httpStatus: null, errorMsg: msg }) }
    fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', credentials: 'omit', signal: controller ? controller.signal : undefined })
      .then(() => ok())
      .catch((err) => {
        if (err && err.name === 'AbortError') { uncertain('abort') }
        else uncertain(String((err && err.message) || err))
      })
  })
}
// Image 资源加载探测：onload → online（主机端口可达且返回了可渲染资源）；
// onerror → reachable-unknown（资源 404/格式不符不代表主机不可达）；
// 仅超时 → timeout。返回 online 时确定在线，其余交由上层仲裁。
const healthProbeBrowserImage = (url, timeout) => {
  return new Promise((resolve) => {
    const started = Date.now()
    const img = new Image()
    let done = false
    const finish = (r) => { if (done) return; done = true; if (r.latency == null) r.latency = Date.now() - started; resolve(r) }
    const timer = setTimeout(() => finish({ status: 'timeout', latency: null, httpStatus: null, errorMsg: 'timeout' }), timeout)
    img.onload = () => { clearTimeout(timer); finish({ status: 'online', latency: null, httpStatus: null, errorMsg: '' }) }
    img.onerror = () => { clearTimeout(timer); finish({ status: 'reachable-unknown', latency: null, httpStatus: null, errorMsg: 'img error' }) }
    img.src = url + (url.indexOf('?') === -1 ? '?' : '&') + '_hc=' + started
  })
}
// 浏览器探测总入口：对单个目标用「fetch + 多路径 Image」并行竞速，
// 任一探测返回 online → 立即 online；全部 timeout → timeout；全部非 online 但有响应不确定 → unknown。
// 浏览器受 CORS 限制，不能把 reachable-unknown 误报成离线；真正精确离线请在 uTools/Node 路径检测。
const healthProbeBrowser = (opts) => {
  return new Promise((resolve) => {
    const timeout = Number(opts && opts.timeout) || 5000
    let url = (opts && opts.url) || ''
    if (!url) { resolve({ status: 'unknown', latency: null, httpStatus: null, errorMsg: '地址无效' }); return }
    const adapted = adaptHealthStrategyForBrowser(url)
    url = adapted.url
    const origin = (() => { try { const u = new URL(url); return u.origin } catch (e) { return url } })()
    // 多路径资源探测，提高跨域服务命中可加载资源的概率
    const probeTargets = [url, origin + '/favicon.ico', origin + '/']
    // 每个探测独享一个较短子超时（取总超时的 0.9，避免串行累加）
    const subTimeout = Math.max(800, Math.floor(timeout * 0.9))
    const tasks = [
      healthProbeBrowserFetch(url, subTimeout),
      ...probeTargets.map((t) => healthProbeBrowserImage(t, subTimeout))
    ]
    let resolved = false
    let timeoutHit = 0
    let finished = 0
    let firstOnlineLatency = null
    const finalize = (status, latency, msg) => {
      if (resolved) return
      resolved = true
      resolve({ status, latency: latency != null ? latency : null, httpStatus: null, errorMsg: status === 'offline' ? (msg || 'unreachable') : (msg || '') })
    }
    tasks.forEach((task) => {
      task.then((r) => {
        finished++
        if (r.status === 'online' && firstOnlineLatency == null) firstOnlineLatency = r.latency
        if (r.status === 'timeout') timeoutHit++
        // 任一 online 立即判在线（最快路径）
        if (r.status === 'online') { finalize('online', r.latency, ''); return }
        // 全部完成且无 online
        if (finished === tasks.length && !resolved) {
          if (timeoutHit === tasks.length) finalize('timeout', null, 'timeout')
          else finalize('unknown', firstOnlineLatency, 'browser probe inconclusive')
        }
      })
    })
    // 总超时保底：到点仍未判定，按已有信号裁决
    setTimeout(() => {
      if (resolved) return
      if (firstOnlineLatency != null) finalize('online', firstOnlineLatency, '')
      else if (timeoutHit > 0) finalize('timeout', null, 'timeout')
      else finalize('unknown', null, 'browser probe inconclusive')
    }, timeout)
  })
}

// ---------- 单条检测 ----------
// 聚合多 target 检测结果。状态优先级：online > timeout > offline > reachable-unknown > unknown。
// 浏览器模式会产生中间态 reachable-unknown（探测失败但不确定是否离线），不能误判为 offline。
const healthErrorMessage = (error, fallback = '检测异常') => String((error && (error.code || error.message)) || error || fallback)
const healthResultFromError = (error) => {
  const message = healthErrorMessage(error)
  const timeoutLike = /timeout|timed\s*out|ETIMEDOUT|AbortError|超时/i.test(message) || (error && error.name === 'AbortError')
  return {
    status: timeoutLike ? 'timeout' : 'offline',
    latency: null,
    httpStatus: null,
    errorMsg: message || '检测异常'
  }
}
const normalizeHealthStatusValue = (status) => {
  const value = String(status || '').trim().toLowerCase()
  if (value === 'online' || value === 'offline' || value === 'timeout' || value === 'unknown' || value === 'reachable-unknown') return value
  if (value === 'reachable_unknown' || value === 'reachableunknown') return 'reachable-unknown'
  if (value === 'timedout' || value === 'time-out') return 'timeout'
  if (value === 'error' || value === 'failed' || value === 'failure' || value === 'unreachable' || value === 'down') return 'offline'
  return 'offline'
}
const normalizeHealthProbeResult = (result) => {
  if (!result || typeof result !== 'object') {
    return { status: 'offline', latency: null, httpStatus: null, errorMsg: '检测无返回结果' }
  }
  const status = normalizeHealthStatusValue(result.status)
  return {
    status,
    latency: result.latency != null ? result.latency : null,
    httpStatus: result.httpStatus != null ? result.httpStatus : null,
    errorMsg: result.errorMsg || (status === 'offline' ? '检测异常' : '')
  }
}
const recordHealthStatus = (id, result) => {
  if (id == null) return
  const normalized = normalizeHealthProbeResult(result)
  const now = Date.now()
  const prev = healthStatus.value[id] || {}
  healthStatus.value = {
    ...healthStatus.value,
    [id]: {
      ...prev,
      status: normalized.status,
      latency: normalized.latency,
      lastChecked: now,
      lastOnline: normalized.status === 'online' ? now : (prev.lastOnline || null),
      httpStatus: normalized.httpStatus,
      errorMsg: normalized.errorMsg || ''
    }
  }
  const h = (healthHistory.value[id] ? healthHistory.value[id].slice() : [])
  h.unshift({ status: normalized.status, ts: now })
  healthHistory.value = {
    ...healthHistory.value,
    [id]: h.slice(0, 10)
  }
}
const mergeHealthAgg = (acc, r) => {
  const normalized = normalizeHealthProbeResult(r)
  if (!acc) return { ...normalized }
  const rank = { online: 4, timeout: 3, offline: 2, 'reachable-unknown': 1, unknown: 0 }
  const ra = rank[acc.status] != null ? rank[acc.status] : 0
  const rb = rank[normalized.status] != null ? rank[normalized.status] : 0
  // 取优先级更高者；online + online 时 latency 取最小
  if (acc.status === 'online' && normalized.status === 'online') {
    const a = acc.latency == null ? Infinity : acc.latency
    const b = normalized.latency == null ? Infinity : normalized.latency
    acc.latency = (a === Infinity && b === Infinity) ? null : Math.min(a, b)
    return acc
  }
  if (rb > ra) return { ...normalized }
  if (rb === ra && normalized.latency != null && (acc.latency == null || normalized.latency < acc.latency)) {
    acc.latency = normalized.latency
  }
  return acc
}
const runHealthCheckSingle = async (item, services) => {
  const id = healthResolveItemId(item)
  if (id == null) return
  const cfg = getItemHealthCheck(item)
  const targets = resolveHealthTargets(item, cfg.checkTarget)
  if (!targets.length) {
    recordHealthStatus(id, { status: 'unknown', latency: null, httpStatus: null, errorMsg: '无可检测地址' })
    return
  }
  const timeout = cfg.timeout || healthUiSettings.value.defaultTimeout
  let agg = null
  for (const rawUrl of targets) {
    const effectiveStrategy = cfg.strategy === 'auto' ? (isHealthHttpUrl(rawUrl) ? 'http' : 'tcp') : cfg.strategy
    let r
    try { r = await services.probe({ url: rawUrl, strategy: effectiveStrategy, timeout }) }
    catch (e) { r = healthResultFromError(e) }
    agg = mergeHealthAgg(agg, r)
  }
  recordHealthStatus(id, agg || { status: 'offline', latency: null, httpStatus: null, errorMsg: '检测无返回结果' })
}

// ---------- 并发批量执行 ----------
const collectHealthItems = () => {
  const items = []
  const seen = new Set()
  for (const cat of orderedRegularCategories.value) {
    for (const it of cat.items) {
      if (it && !seen.has(it.id)) { seen.add(it.id); items.push(it) }
    }
  }
  return items
}
const collectEnabledHealthItems = () => collectHealthItems().filter(isHealthCheckEnabledFor)
const collectEnabledHealthItemsForCategory = (category) => {
  if (!category) return []
  const ids = collectSubtreeCategoryIds(category.id)
  const items = []
  for (const cid of ids) {
    const cat = regularCategoryMap.value.get(cid)
    if (cat) for (const it of cat.items) if (isHealthCheckEnabledFor(it)) items.push(it)
  }
  return items
}
const healthEnabledItemCount = computed(() => collectEnabledHealthItems().length)
const healthCategoryEnabledCount = (category) => collectEnabledHealthItemsForCategory(category).length
const formatHealthCheckEstimate = (count) => {
  const concurrency = Math.max(1, Number(healthUiSettings.value.concurrency) || 5)
  const timeoutMs = Math.max(500, Number(healthUiSettings.value.defaultTimeout) || 5000)
  const batches = Math.max(1, Math.ceil(count / concurrency))
  const seconds = Math.max(1, Math.ceil((batches * timeoutMs) / 1000))
  return seconds <= 60 ? `约 ${seconds} 秒内` : `约 ${Math.ceil(seconds / 60)} 分钟内`
}
const startHealthCheckTask = (items, label = '连通检测') => {
  if (!items.length) {
    showToast('尚未启用任何分类的连通检测。请到「系统应用设置 → 连通检测 → 分类检测配置」选择分类并启用。', 'warning')
    return
  }
  const estimate = formatHealthCheckEstimate(items.length)
  showToast(`${label}已开始：${items.length} 个已启用链接，预计${estimate}完成`, 'success')
  setTimeout(() => {
    runHealthCheckBatch(items)
      .then(() => showToast(`${label}完成：已检测 ${items.length} 个链接`, 'success'))
      .catch((e) => showToast(`${label}失败：${(e && e.message) || e}`, 'error'))
  }, 0)
}
const runHealthCheckBatch = async (items) => {
  const services = getHealthServices()
  if (!services.available) {
    // 极端兜底：连浏览器降级探测都不可用（无 fetch/Image 的环境）
    showToast('连通检测服务不可用', 'warning')
    for (const it of items) {
      recordHealthStatus(healthResolveItemId(it), { status: 'offline', latency: null, httpStatus: null, errorMsg: '服务不可用' })
    }
    return
  }
  const queue = items.slice()
  queue.forEach((it) => {
    const id = healthResolveItemId(it)
    if (id != null) {
      const prev = healthStatus.value[id] || {}
      healthStatus.value = {
        ...healthStatus.value,
        [id]: { ...prev, status: 'checking' }
      }
    }
  })
  const concurrency = Math.max(1, Number(healthUiSettings.value.concurrency) || 5)
  const size = Math.min(concurrency, queue.length)
  const worker = async () => {
    while (queue.length) {
      const it = queue.shift()
      if (!it) break
      healthActiveCount.value++
      try { await runHealthCheckSingle(it, services) }
      catch (e) { recordHealthStatus(healthResolveItemId(it), healthResultFromError(e)) }
      finally { healthActiveCount.value-- }
    }
  }
  const workers = []
  for (let i = 0; i < size; i++) workers.push(worker())
  await Promise.all(workers)
}

// ---------- 触发：全量 / 单条 / 分类 ----------
const runHealthCheckAll = () => {
  if (!healthFeatureOn.value) return
  const items = collectEnabledHealthItems()
  if (!items.length) { showToast('尚未启用任何分类的连通检测。请到「系统应用设置 → 连通检测 → 分类检测配置」选择分类并启用。', 'warning'); return }
  startHealthCheckTask(items, '全局连通检测')
}
const runHealthCheckForItem = async (item) => {
  if (!healthFeatureOn.value) return
  const source = (item && item.sourceItemId != null) ? findRegularItemById(item.sourceItemId) : item
  if (!source) return
  await runHealthCheckBatch([source])
}
const runHealthCheckForCategory = (category) => {
  if (!healthFeatureOn.value) return
  const items = collectEnabledHealthItemsForCategory(category)
  if (!items.length) { showToast('当前分类尚未启用连通检测。请到「系统应用设置 → 连通检测 → 分类检测配置」选择该分类并启用。', 'warning'); return }
  startHealthCheckTask(items, `分类「${category.displayName || category.name}」连通检测`)
}

// ---------- 轮询 ----------
const healthPollingTick = async () => {
  if (!healthFeatureOn.value || !healthUiSettings.value.pollingEnabled) return
  if (document.hidden) return // 仅插件可见时运行
  const items = collectHealthItems().filter(isHealthCheckEnabledFor)
  if (items.length) await runHealthCheckBatch(items)
}
const stopHealthPolling = () => {
  if (healthPollingTimer) { clearInterval(healthPollingTimer); healthPollingTimer = null }
}
const startHealthPolling = () => {
  stopHealthPolling()
  if (!healthFeatureOn.value || !healthUiSettings.value.pollingEnabled) return
  const interval = Math.max(10, Number(healthUiSettings.value.pollingInterval) || 60) * 1000
  healthPollingTimer = setInterval(() => { healthPollingTick() }, interval)
}
const restartHealthPollingIfNeeded = () => {
  if (healthFeatureOn.value && healthUiSettings.value.pollingEnabled) startHealthPolling()
  else stopHealthPolling()
}
watch(() => [healthUiSettings.value.pollingEnabled, healthUiSettings.value.pollingInterval, healthUiSettings.value.globalEnabled], () => restartHealthPollingIfNeeded())
const handleHealthVisibilityChange = () => {
  if (!document.hidden && healthFeatureOn.value && healthUiSettings.value.pollingEnabled) {
    healthPollingTick()
  }
}

// ---------- 启动自动检测 ----------
const runHealthAutoCheckOnStart = async () => {
  if (!healthFeatureOn.value || !healthUiSettings.value.autoCheckOnStart) return
  const items = collectHealthItems().filter(isHealthCheckEnabledFor)
  if (items.length) await runHealthCheckBatch(items)
}

// ---------- 汇总（顶部 badge / 分类概览） ----------
const healthSummary = computed(() => {
  let online = 0, offline = 0, timeout = 0, checking = 0, unknown = 0
  const items = collectHealthItems()
  for (const it of items) {
    const s = healthGetStatus(it)
    const st = s ? s.status : 'unknown'
    if (st === 'online') online++
    else if (st === 'checking') checking++
    else if (st === 'timeout') timeout++
    else if (healthIsAbnormalResult(s)) offline++
    else unknown++
  }
  return { online, offline, timeout, checking, unknown, total: items.length }
})
const healthAbnormalCount = computed(() => healthSummary.value.offline + healthSummary.value.timeout)
const healthIsChecking = computed(() => healthActiveCount.value > 0 || healthSummary.value.checking > 0)
const healthCategoryOverview = (category) => {
  let online = 0, offline = 0
  const ids = collectSubtreeCategoryIds(category.id)
  for (const cid of ids) {
    const cat = regularCategoryMap.value.get(cid)
    if (!cat) continue
    for (const it of cat.items) {
      if (!isHealthCheckEnabledFor(it)) continue
      const s = healthGetStatus(it)
      if (!s) continue
      if (s.status === 'online') online++
      else if (healthIsAbnormalResult(s)) offline++
    }
  }
  return { online, offline }
}
const healthAbnormalItems = computed(() => {
  if (!healthFeatureOn.value) return []
  const out = []
  for (const it of collectHealthItems()) {
    const s = healthGetStatus(it)
    if (healthIsAbnormalResult(s)) {
      out.push({ item: it, status: s, path: formatCategoryPath(findCategoryByItemId(it.id)) })
    }
  }
  return out
})
const toggleHealthAbnormalFilter = () => {
  if (!healthFeatureOn.value) return
  healthOnlyAbnormalFilter.value = !healthOnlyAbnormalFilter.value
}

// ---------- Tooltip 反查（不修改现有 urlTooltip 写入逻辑） ----------
const healthTooltipSummary = computed(() => {
  if (!healthFeatureOn.value) return null
  const t = urlTooltip.value
  if (!t || !t.visible) return null
  const iUrl = t.internalUrl === '未设置' ? '' : (t.internalUrl || '')
  const eUrl = t.externalUrl === '未设置' ? '' : (t.externalUrl || '')
  const note = t.note || ''
  let matched = null
  for (const it of collectHealthItems()) {
    if ((it.internalUrl || '') === iUrl && (it.externalUrl || '') === eUrl && (it.note || '') === note) { matched = it; break }
  }
  if (!matched) {
    for (const fav of favoriteItems.value) {
      const src = resolveFavoriteItem(fav)
      if ((src.internalUrl || '') === iUrl && (src.externalUrl || '') === eUrl && (src.note || '') === note) { matched = src; break }
    }
  }
  if (!matched) return null
  const id = healthResolveItemId(matched)
  return { itemId: id, status: healthStatus.value[id] || null, history: healthHistory.value[id] || [] }
})
const formatHealthTime = (ts) => {
  if (!ts) return '—'
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// ---------- 编辑弹窗连通配置（不修改 saveItem/editItem/closeDialog） ----------
const defaultHealthEditConfig = () => ({
  enabled: false,
  strategy: 'auto',
  timeoutMode: 'inherit',
  timeout: healthUiSettings.value.defaultTimeout,
  checkTarget: 'follow'
})
const healthEditConfig = ref(defaultHealthEditConfig())
const healthEditTouched = ref(false)
const healthEditCollapsed = ref(false)
let healthAddSnapshot = null
const markHealthEditTouched = () => { healthEditTouched.value = true }
const buildItemHealthCheckFromConfig = (cfg) => ({
  enabled: cfg.enabled === true,
  strategy: cfg.strategy || 'auto',
  timeout: cfg.timeoutMode === 'custom' ? (Number(cfg.timeout) || healthUiSettings.value.defaultTimeout) : healthUiSettings.value.defaultTimeout,
  checkTarget: cfg.checkTarget || 'follow'
})
const healthConfigFromItemCheck = (hc) => ({
  enabled: hc.enabled !== false,
  strategy: hc.strategy || 'auto',
  timeoutMode: (hc.timeout != null && Number(hc.timeout) !== Number(healthUiSettings.value.defaultTimeout)) ? 'custom' : 'inherit',
  timeout: hc.timeout != null ? Number(hc.timeout) : healthUiSettings.value.defaultTimeout,
  checkTarget: hc.checkTarget || 'follow'
})
// 连通配置在 saveItem 中统一提交（编辑）或写入 createdItem（新增），不依赖 live 回写，避免时序竞态。
// 此处仅负责打开时填充表单、关闭时重置本地状态。
watch(() => dialog.value.visible, (vis) => {
  if (vis) {
    healthEditTouched.value = false
    if (dialog.value.mode === 'edit' && dialog.value.editingItem) {
      const hc = dialog.value.editingItem.healthCheck
      healthEditConfig.value = hc ? healthConfigFromItemCheck(hc) : defaultHealthEditConfig()
    } else {
      healthAddSnapshot = { createdItem: null }
      healthEditConfig.value = defaultHealthEditConfig()
    }
  } else {
    healthAddSnapshot = null
    healthEditTouched.value = false
    healthEditConfig.value = defaultHealthEditConfig()
  }
})

// ---------- 批量操作 ----------
const healthSettingsBatchCategories = ref([])
const healthCategoryDropdownOpen = ref(false)
let healthCategoryDropdownCloseTimer = null
const cancelHealthCategoryDropdownClose = () => {
  if (healthCategoryDropdownCloseTimer) {
    clearTimeout(healthCategoryDropdownCloseTimer)
    healthCategoryDropdownCloseTimer = null
  }
}
const scheduleHealthCategoryDropdownClose = () => {
  cancelHealthCategoryDropdownClose()
  healthCategoryDropdownCloseTimer = setTimeout(() => {
    healthCategoryDropdownOpen.value = false
    healthCategoryDropdownCloseTimer = null
  }, 1000)
}
const toggleHealthCategoryDropdown = () => {
  cancelHealthCategoryDropdownClose()
  healthCategoryDropdownOpen.value = !healthCategoryDropdownOpen.value
}
const healthSelectedCategorySummary = computed(() => {
  const selectedIds = healthSettingsBatchCategories.value.filter(categoryId => regularCategoryMap.value.has(categoryId))
  if (selectedIds.length === 0) return '请选择分类'
  if (selectedIds.length === 1) {
    const category = regularCategoryMap.value.get(selectedIds[0])
    return formatCategoryPath(category) || category?.name || '已选择 1 个分类'
  }
  return `已选择 ${selectedIds.length} 个分类`
})
const getHealthCategoryLinkCount = (categoryId) => {
  let n = 0
  for (const cid of collectSubtreeCategoryIds(categoryId)) {
    const cat = regularCategoryMap.value.get(cid)
    if (cat) n += cat.items.length
  }
  return n
}
const healthCategoryConfigState = (category) => {
  if (!category) return 'unset'
  if (category.healthCheck && category.healthCheck.enabled === true) return 'enabled'
  if (category.healthCheck && category.healthCheck.enabled === false) return 'disabled'
  return healthIsCategoryEnabled(category) ? 'inherited' : 'unset'
}
const healthCategoryConfigLabel = (category) => {
  const map = {
    enabled: '已启用',
    disabled: '已停用',
    inherited: '继承启用',
    unset: '未设置'
  }
  return map[healthCategoryConfigState(category)] || '未设置'
}
const healthCategoryConfigClass = (category) => `health-category-${healthCategoryConfigState(category)}`
const selectAllHealthBatchCategories = () => {
  healthSettingsBatchCategories.value = orderedRegularCategories.value.map(category => category.id)
}
const clearHealthBatchCategories = () => {
  healthSettingsBatchCategories.value = []
}
const toggleHealthBatchCategorySelection = (categoryId, checked) => {
  const current = new Set(healthSettingsBatchCategories.value)
  if (checked) current.add(categoryId)
  else current.delete(categoryId)
  healthSettingsBatchCategories.value = Array.from(current)
}
const setHealthForCategory = (categoryId, enabled, options = {}) => {
  const { silent = false } = options
  const category = regularCategoryMap.value.get(categoryId)
  if (!category) return 0
  const base = category.healthCheck || {}
  category.healthCheck = {
    enabled: !!enabled,
    strategy: base.strategy || 'auto',
    timeout: base.timeout != null ? base.timeout : healthUiSettings.value.defaultTimeout,
    checkTarget: base.checkTarget || 'follow'
  }
  if (!silent) {
    saveData()
    const linkCount = getHealthCategoryLinkCount(categoryId)
    showToast(`已${enabled ? '启用' : '停用'}「${formatCategoryPath(category) || category.name}」的连通检测，影响当前 ${linkCount} 个链接，后续新增链接会自动继承`, 'success')
  }
  return getHealthCategoryLinkCount(categoryId)
}
const runBatchSetHealth = (enabled) => {
  const selectedIds = healthSettingsBatchCategories.value.filter(categoryId => regularCategoryMap.value.has(categoryId))
  if (selectedIds.length === 0) {
    showToast(`请先选择要${enabled ? '启用' : '停用'}连通检测的分类`, 'warning')
    return
  }

  let linkCount = 0
  selectedIds.forEach(categoryId => {
    linkCount += setHealthForCategory(categoryId, enabled, { silent: true })
  })
  saveData()
  showToast(`已${enabled ? '启用' : '停用'} ${selectedIds.length} 个分类的连通检测，影响当前 ${linkCount} 个链接，后续新增链接会自动继承`, 'success')
}
const runBatchEnableHealth = () => {
  runBatchSetHealth(true)
}
const runBatchDisableHealth = () => {
  runBatchSetHealth(false)
}
const resetAllHealthCheckConfig = () => {
  if (!confirm('确定将所有分类的连通检测配置重置为默认未启用状态？')) return
  let n = 0
  for (const cat of orderedRegularCategories.value) {
    if (cat.healthCheck != null) { delete cat.healthCheck; n++ }
  }
  saveData()
  showToast(`已重置 ${n} 个分类的连通检测配置`, 'success')
}
const clearAllHealthCheckConfig = () => {
  if (!confirm('确定清除所有分类的连通检测配置？清除后所有分类默认不参与检测。')) return
  let n = 0
  for (const cat of orderedRegularCategories.value) {
    if (cat.healthCheck != null) { delete cat.healthCheck; n++ }
  }
  saveData()
  showToast(`已清除 ${n} 个分类的连通检测配置`, 'success')
}

// ---------- 生命周期（新增独立钩子，不修改现有 onMounted/onUnmounted） ----------
onMounted(() => {
  loadHealthUiSettings()
  runHealthAutoCheckOnStart()
  restartHealthPollingIfNeeded()
  document.addEventListener('visibilitychange', handleHealthVisibilityChange)
})
onUnmounted(() => {
  stopHealthPolling()
  cancelHealthCategoryDropdownClose()
  document.removeEventListener('visibilitychange', handleHealthVisibilityChange)
})
</script>

<style>
/* 暗黑模式样式 */
.dark-mode {
  background: #1f2329;
  color: #e6e1d8;
}

.dark-mode .header {
  background: linear-gradient(135deg, #33424f 0%, #425566 100%);
}

.dark-mode .search-input {
  background: rgba(255,255,255,0.1);
  color: white;
  border-color: rgba(255,255,255,0.2);
}

.dark-mode .search-input::placeholder {
  color: rgba(255,255,255,0.5);
}

.dark-mode.wallpaper-active .content {
  background: linear-gradient(180deg, rgba(24, 29, 35, 0.72) 0%, rgba(31, 38, 46, 0.76) 100%);
}

.dark-mode .content {
  background:
    radial-gradient(circle at top left, rgba(255, 152, 0, 0.08), transparent 28%),
    linear-gradient(180deg, #20262d 0%, #262c34 100%);
}

.dark-mode .function-bar {
  background: linear-gradient(135deg, rgba(44, 62, 80, 0.6) 0%, rgba(52, 73, 94, 0.6) 100%);
  border-bottom-color: rgba(255, 255, 255, 0.05);
}

.dark-mode .manage-function-bar {
  background: linear-gradient(135deg, rgba(44, 62, 80, 0.6) 0%, rgba(52, 73, 94, 0.6) 100%);
}

.dark-mode .function-btn {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
  color: #e0e0e0;
}

.dark-mode .function-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.35);
}

.dark-mode .favorites-section {
  background: rgba(49, 56, 66, 0.96);
  box-shadow: 0 10px 24px rgba(0,0,0,0.18);
  border: 1px solid rgba(255,255,255,0.04);
}

.dark-mode .favorites-header:hover {
  background: rgba(255,255,255,0.05);
}

.dark-mode .favorites-label {
  color: #ffd180;
}

.dark-mode .favorites-count {
  background: rgba(255, 152, 0, 0.2);
  color: #ffcc80;
}

.dark-mode .favorite-tag {
  background: rgba(255, 152, 0, 0.14);
  border-color: rgba(255, 152, 0, 0.24);
  color: #ffe0b2;
}

.dark-mode .favorite-tag:hover {
  background: rgba(255, 152, 0, 0.22);
  border-color: rgba(255, 152, 0, 0.4);
}

.dark-mode .favorite-tag-remove {
  color: #ffcc80;
}

.dark-mode .favorite-menu-item,
.dark-mode .favorite-add-dropdown,
.dark-mode .favorite-heart-action {
  background: rgba(255, 152, 0, 0.12);
  color: #ffd180;
}

.dark-mode .favorite-menu-item:hover,
.dark-mode .favorite-add-dropdown:hover,
.dark-mode .favorite-heart-action:hover {
  background: rgba(255, 152, 0, 0.22);
}

.dark-mode .favorite-remove-dropdown,
.dark-mode .favorite-heart-btn.is-active,
.dark-mode .favorite-heart-action.is-active {
  background: rgba(244, 67, 54, 0.14);
  color: #ffab91;
}

.dark-mode .favorite-remove-dropdown:hover,
.dark-mode .favorite-heart-btn.is-active:hover,
.dark-mode .favorite-heart-action.is-active:hover {
  background: rgba(244, 67, 54, 0.24);
}

.dark-mode .category-section {
  background: rgba(44, 51, 60, 0.96);
  box-shadow: 0 12px 28px rgba(0,0,0,0.18);
  border: 1px solid rgba(255,255,255,0.04);
}

.dark-mode .category-header:hover {
  background: rgba(255,255,255,0.05);
}

.dark-mode .category-name {
  color: #e0e0e0;
}

.dark-mode .category-count {
  background: #3a3a3a;
  color: #b0b0b0;
}

.dark-mode .collapse-icon {
  color: #b0b0b0;
}

.dark-mode .item-card {
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%),
    linear-gradient(145deg, #343c46, #2b323b);
  border-color: rgba(255,255,255,0.07);
  box-shadow: 0 8px 18px rgba(0,0,0,0.2);
}

.dark-mode .item-card:hover {
  border-color: #ff9800;
  box-shadow: 0 14px 28px rgba(0,0,0,0.24), 0 0 0 1px rgba(255,152,0,0.2);
}

.dark-mode .item-name {
  color: #e0e0e0;
}

.dark-mode .item-note,
.dark-mode .list-item-note {
  color: #9e9e9e;
}

.dark-mode .item-icon {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.08);
}

.dark-mode .item-menu-btn {
  background: transparent;
  border-color: transparent;
  color: #d5d9de;
  box-shadow: none;
}

.dark-mode .item-menu-btn:hover {
  background: rgba(255,255,255,0.16);
  border-color: rgba(255, 183, 77, 0.4);
  color: #ffcc80;
}

.dark-mode .item-menu,
.item-menu.dark-mode {
  background: #2d2d2d;
  border-color: #3a3a3a;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.dark-mode .menu-item {
  color: #e0e0e0;
}

.dark-mode .menu-item:hover {
  background: #3a3a3a;
}

.dark-mode .list-item {
  background: rgba(50, 58, 68, 0.96);
  border-color: rgba(255,255,255,0.06);
}

.dark-mode .list-item:hover {
  border-color: #ff9800;
  box-shadow: 0 2px 8px rgba(255,152,0,0.25);
}

.dark-mode .list-item-name {
  color: #e0e0e0;
}

.dark-mode .url-tag {
  background: #3a3a3a;
  color: #b0b0b0;
}

.dark-mode .url-tag.internal {
  background: #1e3a5f;
  color: #64b5f6;
}

.dark-mode .url-tag.external {
  background: #4a1e5f;
  color: #ba68c8;
}

.dark-mode .dialog {
  background: #303844;
}

.dark-mode .dialog-header {
  border-bottom-color: #3a3a3a;
}

.dark-mode .dialog-header h3 {
  color: #e0e0e0;
}

.dark-mode .dialog-body label {
  color: #b0b0b0;
}

.dark-mode .dialog-body input,
.dark-mode .dialog-body select,
.dark-mode .dialog-body textarea {
  background: #232a33;
  border-color: #3f4854;
  color: #e0e0e0;
}

.dark-mode .dialog-body input::placeholder,
.dark-mode .dialog-body textarea::placeholder {
  color: #666;
}

.dark-mode .management-sidebar {
  background: #2c333c;
}

.dark-mode .management-header {
  background: #2f3741;
  border-bottom-color: #414b57;
}

.dark-mode .management-header h3 {
  color: #e0e0e0;
}

.dark-mode .settings-tabs {
  background: linear-gradient(180deg, #2d3640 0%, #2a3139 100%);
  border-right-color: #3b4652;
}

.dark-mode .settings-tab-btn {
  background: rgba(255,255,255,0.04);
  border-color: #47515c;
  color: #d7dee6;
}

.dark-mode .settings-tab-btn:hover {
  background: rgba(255,255,255,0.08);
  border-color: #64748b;
}

.dark-mode .settings-tab-btn.active {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  border-color: #ff9800;
  color: #fff;
}

.dark-mode .settings-nav-toggle {
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
}

.dark-mode .icon-btn-small {
  background: #3a3a3a;
  color: #e0e0e0;
  border-color: #4a4a4a;
}

.dark-mode .icon-btn-small:hover {
  background: #4a4a4a;
  border-color: #5a5a5a;
}

.dark-mode .import-export-btn {
  color: #e0e0e0;
}

.dark-mode .total-count {
  color: #b0b0b0;
}

.dark-mode .settings-section-title,
.dark-mode .settings-item-title {
  color: #f1f5f9;
}

.dark-mode .settings-section-subtitle,
.dark-mode .settings-item-desc,
.dark-mode .about-line {
  color: #c7d0da;
}

.dark-mode .settings-card {
  background: linear-gradient(180deg, #313a45 0%, #2a3139 100%);
  border-color: #3f4a56;
  box-shadow: 0 14px 30px rgba(0,0,0,0.25);
}

.dark-mode .toggle-card {
  background: rgba(255,255,255,0.03);
  border-color: #46515d;
}

.dark-mode .layout-pill-switch {
  background: #242b33;
  border-color: #4a5664;
  color: #c7d0da;
}

.dark-mode .layout-pill-switch::before {
  background: linear-gradient(180deg, #3a4653 0%, #303944 100%);
  box-shadow: 0 2px 10px rgba(0,0,0,0.28);
}

.dark-mode .layout-pill-switch.active::before {
  background: linear-gradient(180deg, #ffb347 0%, #ff9800 100%);
}

.dark-mode .layout-pill-switch:hover {
  border-color: #ff9800;
  box-shadow: 0 4px 14px rgba(255, 152, 0, 0.18);
}

.dark-mode .layout-pill-switch:not(.active) span:first-child,
.dark-mode .layout-pill-switch.active span:last-child {
  color: #ffffff;
}

.dark-mode .layout-pill-switch.active span:first-child,
.dark-mode .layout-pill-switch:not(.active) span:last-child {
  color: #9aa7b4;
}

.dark-mode .wallpaper-preview {
  background: linear-gradient(135deg, #2f3740 0%, #27303a 100%);
  border-color: #46515d;
}

.dark-mode .wallpaper-placeholder,
.dark-mode .wallpaper-hint {
  color: #d2b78d;
}

.dark-mode .last-uploaded-wallpaper-card {
  background: rgba(255,255,255,0.04);
  border-color: #46515d;
}

.dark-mode .last-uploaded-wallpaper-card:hover {
  border-color: #d2b78d;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.24);
}

.dark-mode .last-uploaded-wallpaper-preview {
  border-color: rgba(210, 183, 141, 0.28);
}

.dark-mode .last-uploaded-wallpaper-title {
  color: #f6d9a8;
}

.dark-mode .last-uploaded-wallpaper-desc {
  color: #d2b78d;
}

.dark-mode .settings-row {
  border-bottom-color: #3b4652;
}

.dark-mode .settings-action-btn {
  background: #2a3139;
  border-color: #46515d;
  color: #e6edf5;
}

.dark-mode .settings-action-btn:hover {
  background: #323b46;
  border-color: #64748b;
}

.dark-mode .settings-action-btn.danger {
  color: #ffb4a8;
  border-color: #7a3f3f;
}

.dark-mode .settings-action-btn.danger:hover {
  background: #472b2b;
  border-color: #a55;
}

.dark-mode .manage-search-input {
  background: linear-gradient(180deg, #2f3741 0%, #28303a 100%);
  border-color: #46515d;
  color: #e0e0e0;
}

.dark-mode .manage-search-input:focus {
  border-color: #ffb74d;
  box-shadow: 0 0 0 3px rgba(255, 183, 77, 0.16);
  background: #313a45;
}

.dark-mode .manage-search-input::placeholder {
  color: #96a3b2;
}

.dark-mode .export-menu-group-label {
  color: #ffcf8a;
}

.dark-mode .export-menu-divider {
  background: #3b4652;
}

.dark-mode .data-management-group {
  background: rgba(255,255,255,0.03);
  border-color: #46515d;
}

.dark-mode .data-group-title {
  color: #f6d7a1;
}

.dark-mode .data-group-desc {
  color: #cdb38b;
}

.dark-mode .danger-group {
  background: linear-gradient(180deg, rgba(98, 54, 54, 0.18) 0%, rgba(62, 36, 36, 0.26) 100%);
  border-color: #6e4a4a;
}

.dark-mode .export-dialog-note {
  background: rgba(255, 152, 0, 0.12);
  border-color: rgba(255, 183, 77, 0.35);
  color: #ffd59a;
}

.dark-mode .export-format-card {
  background: linear-gradient(180deg, #313a45 0%, #2a3139 100%);
  border-color: #46515d;
}

.dark-mode .export-format-card:hover {
  border-color: #ffb74d;
  box-shadow: 0 12px 28px rgba(0,0,0,0.28);
}

.dark-mode .export-format-title {
  color: #f4e0ba;
}

.dark-mode .export-format-desc {
  color: #c8b28d;
}

.dark-mode .manage-category-block {
  background: rgba(45, 52, 61, 0.98);
  border-color: rgba(255,255,255,0.05);
}

.dark-mode .manage-category-header {
  background: rgba(255,255,255,0.03);
}

.dark-mode .category-name-display {
  color: #e0e0e0;
}

.dark-mode .item-count-badge {
  background: #3a3a3a;
  color: #b0b0b0;
}

.dark-mode .manage-item {
  background: rgba(52, 60, 70, 0.96);
  border-color: rgba(255,255,255,0.05);
}

.dark-mode .manage-item:hover {
  background: rgba(255,255,255,0.06);
}

.dark-mode .manage-item-name {
  color: #e0e0e0;
}

.dark-mode .category-dropdown-menu,
.dark-mode .item-dropdown-menu {
  background: #2d2d2d;
  border-color: #3a3a3a;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.dark-mode .dropdown-item {
  color: #e0e0e0;
}

.dark-mode .dropdown-item:hover {
  background: #3a3a3a;
}

.dark-mode .dropdown-item.danger:hover {
  background: #4a1a1a;
}

.dark-mode .export-menu {
  background: #2d2d2d;
  border-color: #3a3a3a;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.dark-mode .export-menu-item {
  color: #e0e0e0;
}

.dark-mode .export-menu-item:hover {
  background: #3a3a3a;
}

.dark-mode .export-menu-item.danger-item {
  color: #ff6b6b;
}

.dark-mode .export-menu-item.danger-item:hover {
  background: #4a1a1a;
}

.dark-mode.wallpaper-active .content {
  background: linear-gradient(180deg, rgba(24, 29, 35, 0.72) 0%, rgba(31, 38, 46, 0.76) 100%);
}

.dark-mode .url-tooltip {
  background: #2d2d2d;
  border-color: #3a3a3a;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.dark-mode .tooltip-mode {
  color: #b0b0b0;
}

.dark-mode .tooltip-label {
  color: #ffcc80;
}

.dark-mode .tooltip-url {
  color: #e0e0e0;
}

.dark-mode .tooltip-note {
  color: #d6d6d6;
}

.dark-mode .page-toast {
  background: rgba(30, 41, 59, 0.94);
  color: #e8f2ff;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.34);
}

.dark-mode .toast-success {
  border-color: rgba(74, 222, 128, 0.3);
}

.dark-mode .toast-warning {
  border-color: rgba(251, 191, 36, 0.3);
}

.dark-mode .toast-error {
  border-color: rgba(248, 113, 113, 0.34);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.navigation-panel {
  width: 100%;
  height: 100vh;
  background: #f5f5f5;
  --wallpaper-blur: 2px;
  --wallpaper-surface-blur: 0px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  transition: background-image 0.25s ease, background-color 0.25s ease;
}

.navigation-panel.wallpaper-active .header,
.navigation-panel.wallpaper-active .function-bar {
  backdrop-filter: blur(4px);
}

.navigation-panel.wallpaper-active .content {
  background: linear-gradient(180deg, rgba(255, 248, 239, 0.26) 0%, rgba(245, 245, 245, 0.32) 100%);
}

/* 顶部标题栏 */
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  flex-shrink: 0;
  background: linear-gradient(135deg, #ff9800 0%, #ff6f00 100%);
  color: white;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 1.5rem;
}

.title {
  font-size: 1.1rem;
  font-weight: bold;
}

.header-center {
  flex: 1;
  max-width: 500px;
  margin: 0 20px;
}

.search-input {
  width: 100%;
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  font-size: 0.9rem;
  outline: none;
  background: rgba(255,255,255,0.9);
}

.search-input::placeholder {
  color: #999;
}

.header-right {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: rgba(255,255,255,0.3);
  transform: scale(1.05);
}

/* 功能控制区 */
.function-bar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 4px 12px;
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.6) 0%, rgba(255, 111, 0, 0.6) 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 60px;
  z-index: 30;
}

.manage-function-bar {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.6) 0%, rgba(255, 111, 0, 0.6) 100%);
  position: sticky;
  top: 0;
  z-index: 10;
}

.settings-tabs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 180px;
  padding: 16px;
  background: linear-gradient(180deg, #fff6eb 0%, #fffaf4 100%);
  border-right: 1px solid #f0dfc8;
  flex-shrink: 0;
  transition: width 0.24s ease, padding 0.24s ease;
}

.settings-tabs.collapsed {
  width: 76px;
  padding: 16px 10px;
}

.settings-tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #f2d2a5;
  background: rgba(255, 255, 255, 0.85);
  color: #8b5a18;
  cursor: pointer;
  transition: all 0.2s ease;
}

.settings-tab-btn.compact {
  justify-content: center;
  padding: 10px;
}

.settings-tab-btn:hover {
  border-color: #ffb74d;
  background: #fff3df;
  transform: translateY(-1px);
}

.settings-tab-btn.active {
  background: linear-gradient(135deg, #ff9800 0%, #ffb547 100%);
  border-color: #f08b00;
  color: white;
  box-shadow: 0 8px 20px rgba(255, 152, 0, 0.22);
}

.settings-tab-icon {
  font-size: 1rem;
  line-height: 1;
}

.settings-tab-text {
  font-size: 0.88rem;
  font-weight: 700;
}

.settings-tabs.collapsed .settings-tab-text {
  display: none;
}

.settings-layout {
  display: flex;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  position: relative;
}

.settings-nav-toggle {
  position: absolute;
  top: 50%;
  left: 180px;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 56px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 152, 0, 0.92) 0%, rgba(245, 124, 0, 0.92) 100%);
  color: white;
  cursor: pointer;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-shadow: 0 6px 18px rgba(255, 152, 0, 0.22);
  transition: left 0.24s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.settings-nav-toggle:hover {
  background: linear-gradient(180deg, rgba(255, 168, 38, 1) 0%, rgba(251, 140, 0, 1) 100%);
  box-shadow: 0 8px 22px rgba(255, 152, 0, 0.3);
}

.settings-nav-toggle.collapsed {
  left: 76px;
}

.function-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  cursor: pointer;
  color: white;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.function-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.function-btn .collapse-icon {
  font-size: 10px;
}

.function-btn .function-text {
  font-size: 12px;
}

/* 主内容区 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.favorites-section {
  margin-bottom: 16px;
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.favorites-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px;
  margin: -6px -6px 8px -6px;
  border-radius: 6px;
  transition: background 0.2s;
}

.favorites-header:hover {
  background: #f5f5f5;
}

.favorites-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f57c00;
}

.favorites-count {
  background: #fff3e0;
  color: #ef6c00;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.favorites-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.favorite-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  border: 1px solid #ffd699;
  background: #fff7ed;
  color: #d66a00;
  border-radius: 999px;
  padding: 9px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.favorite-tag:hover {
  background: #ffe7c2;
  border-color: #ffb74d;
  transform: translateY(-1px);
}

.favorite-tag-text {
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.favorite-tag-remove {
  font-size: 0.74rem;
  line-height: 1;
  color: #ef6c00;
}

.favorite-heart-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.65);
  color: #ef6c00;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.favorite-heart-btn:hover {
  background: #fff3e0;
  transform: translateY(-1px);
}

.favorite-heart-btn.is-active {
  background: #fff1f0;
  color: #d84315;
}

/* 分类区块 */
.category-section {
  margin-bottom: 16px;
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px;
  margin: -6px -6px 8px -6px;
  border-radius: 6px;
  transition: background 0.2s;
}

.category-header:hover {
  background: #f5f5f5;
}

.collapse-icon {
  font-size: 0.75rem;
  color: #666;
  width: 14px;
}

.category-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

.category-count {
  background: #e0e0e0;
  color: #666;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 0.7rem;
}

.category-add-btn {
  margin-left: auto;
  background: #ff9800;
  color: white;
  border: none;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.category-add-btn:hover {
  background: #f57c00;
  transform: scale(1.05);
}

/* 网格视图 */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--grid-card-min, 104px), 1fr));
  gap: 12px;
}

@media (min-width: 768px) {
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(var(--grid-card-min, 104px), 1fr));
  }
}

@media (max-width: 767px) {
  .items-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.item-card {
  background:
    radial-gradient(circle at top, rgba(255, 152, 0, 0.12), transparent 38%),
    linear-gradient(180deg, #ffffff 0%, #f7f2ea 100%);
  border: 1px solid rgba(255, 152, 0, 0.14);
  border-radius: var(--grid-card-radius, 16px);
  padding: var(--grid-card-padding-y, 12px) var(--grid-card-padding-x, 8px) calc(var(--grid-card-padding-y, 12px) - 2px);
  text-align: left;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow: 0 8px 20px rgba(221, 133, 46, 0.1);
  z-index: 1;
  min-height: var(--grid-card-min-height, 138px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.item-card.menu-active {
  z-index: 200;
}

.item-menu-btn {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--grid-card-icon-radius, 14px);
  cursor: pointer;
  font-size: 1rem;
  color: #7a6144;
  transition: all 0.2s;
  z-index: 10;
  box-shadow: 0 4px 10px rgba(128, 82, 24, 0.08);
  backdrop-filter: blur(6px);
}

.item-menu-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(255, 152, 0, 0.32);
  color: #d66a00;
  transform: scale(1.04);
}

.item-menu {
  position: absolute;
  top: 30px;
  right: 4px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100;
  min-width: 100px;
  overflow: hidden;
}

.item-menu.item-menu-floating {
  position: fixed;
  top: auto;
  right: auto;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
}

.menu-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 0.9rem;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
}

.menu-item:hover {
  background: #f5f5f5;
}

.favorite-menu-item {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  color: #d66a00;
  font-weight: 700;
}

.favorite-menu-item:hover {
  background: linear-gradient(135deg, #ffe7c2 0%, #ffd18a 100%);
}

.favorite-menu-heart {
  font-size: 1rem;
  line-height: 1;
}

.favorite-menu-heart.active {
  color: #d84315;
}

.item-card:hover {
  border-color: #ff9800;
  transform: translateY(-4px);
  box-shadow: 0 14px 24px rgba(255, 152, 0, 0.16);
}

.item-icon {
  font-size: var(--grid-card-emoji-size, 1.55rem);
  margin-bottom: 10px;
  height: var(--grid-card-icon-box, 44px);
  width: var(--grid-card-icon-box, 44px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--grid-card-icon-radius, 14px);
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(255, 152, 0, 0.12);
  filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.15));
}

.item-icon img {
  width: var(--grid-card-icon-size, 24px);
  height: var(--grid-card-icon-size, 24px);
  object-fit: contain;
  filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.15));
}

.item-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
}

.item-name {
  width: 100%;
  font-size: var(--grid-card-name-size, 0.76rem);
  font-weight: 700;
  color: #333;
  line-height: 1.35;
  text-align: center;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
}

.item-note {
  width: 100%;
  font-size: var(--grid-card-note-size, 0.68rem);
  color: #7d7468;
  line-height: 1.4;
  text-align: center;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
}

/* 列表视图 */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.list-item:hover {
  border-color: #ff9800;
  box-shadow: 0 2px 8px rgba(255,152,0,0.15);
}

.list-item-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.list-item-icon img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.list-item-info {
  flex: 1;
  min-width: 0;
}

.list-item-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.list-item-note {
  font-size: 0.8rem;
  color: #777;
  line-height: 1.45;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
}

.list-item-urls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.url-tag {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 3px;
  background: #f0f0f0;
  color: #666;
}

.url-tag.internal {
  background: #e3f2fd;
  color: #1976d2;
}

.url-tag.external {
  background: #f3e5f5;
  color: #7b1fa2;
}

.list-item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.navigation-panel.wallpaper-active .favorites-section,
.navigation-panel.wallpaper-active .category-section,
.navigation-panel.wallpaper-active .item-card,
.navigation-panel.wallpaper-active .list-item {
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 10px 22px rgba(61, 33, 4, 0.08);
  backdrop-filter: blur(var(--wallpaper-surface-blur, 0px));
}

.navigation-panel.wallpaper-active .favorite-tag {
  background: rgba(255, 247, 237, 0.48);
  border-color: rgba(255, 183, 77, 0.48);
  box-shadow: 0 8px 16px rgba(214, 106, 0, 0.06);
}

.navigation-panel.wallpaper-active .item-note,
.navigation-panel.wallpaper-active .list-item-note,
.navigation-panel.wallpaper-active .tooltip-note {
  color: #5d4a2c;
}

.dark-mode.wallpaper-active .favorites-section,
.dark-mode.wallpaper-active .category-section,
.dark-mode.wallpaper-active .item-card,
.dark-mode.wallpaper-active .list-item {
  background: rgba(20, 26, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
}

.dark-mode.wallpaper-active .favorite-tag {
  background: rgba(78, 52, 16, 0.46);
  border-color: rgba(255, 183, 77, 0.4);
}

/* 对话框 */
.dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: calc(100% - 32px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
  font-size: 0.9rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #ff9800;
}

.form-group textarea {
  resize: vertical;
  min-height: 84px;
  font-family: inherit;
  line-height: 1.5;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #ff9800;
  color: #666;
}

.btn-cancel:hover {
  background: #ff9800;
}

.btn-primary {
  background: #ff9800;
  color: white;
}

.btn-primary:hover {
  background: #f57c00;
}

.danger-item {
  color: #d32f2f !important;
}

.danger-item:hover {
  background: #ffebee !important;
}

/* 分类管理侧边栏样式 */
.management-overlay {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.3);
  z-index: 1000;
}

.management-sidebar {
  position: fixed;
  left: 0;
  top: 60px;
  bottom: 0;
  width: 380px;
  max-width: 80vw;
  min-width: 280px;
  background: white;
  box-shadow: 2px 0 8px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  animation: slideInLeft 0.3s ease;
  overflow: hidden;
}

.management-sidebar.drawer-right {
  left: auto;
  right: 0;
  box-shadow: -2px 0 8px rgba(0,0,0,0.15);
  animation: slideInRight 0.3s ease;
}

.sidebar-resize-handle {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
  transition: background 0.2s;
}

.management-sidebar.drawer-right .sidebar-resize-handle {
  right: auto;
  left: -3px;
}

.sidebar-resize-handle:hover,
.sidebar-resize-handle:active {
  background: rgba(255, 152, 0, 0.4);
}

@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.management-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, #ffffff 0%, #f5efe5 100%);
  position: sticky;
  top: 0;
  z-index: 60;
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.management-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.export-menu {
  position: absolute;
  top: 60px;
  right: 16px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100;
  min-width: 150px;
  overflow: hidden;
}

.export-menu-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 0.9rem;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-menu-item:hover {
  background: #f5f5f5;
}

.export-menu-group-label {
  padding: 10px 16px 6px;
  font-size: 0.74rem;
  font-weight: 700;
  color: #a36d1f;
  letter-spacing: 0.04em;
}

.export-menu-divider {
  height: 1px;
  margin: 4px 12px;
  background: #f0dfc8;
}

.total-count {
  font-size: 0.85rem;
  color: #666;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn-small {
  background: linear-gradient(180deg, #ffffff 0%, #f6f1e8 100%);
  border: 1px solid #d6c4aa;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  color: #5f4520;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(111, 74, 13, 0.08);
  transition: all 0.2s;
}

.icon-btn-small:hover {
  background: linear-gradient(180deg, #fff8ee 0%, #ffe6c2 100%);
  border-color: #ff9800;
  color: #7a4c00;
}

.import-export-btn {
  font-size: 1.2rem;
  font-weight: bold;
  color: #555;
}

.management-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  position: relative;
  min-width: 0;
  container-type: inline-size;
}

.settings-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.settings-section-title {
  font-size: 1rem;
  font-weight: 700;
  color: #2c2c2c;
}

.settings-section-subtitle {
  margin-top: 4px;
  font-size: 0.82rem;
  color: #777;
}

.settings-section-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.manage-search-row {
  margin-bottom: 12px;
}

.manage-search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2d2ba;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #fbf7f1 100%);
  color: #3a2a16;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-sizing: border-box;
}

.manage-search-input:focus {
  border-color: #ffb74d;
  box-shadow: 0 0 0 3px rgba(255, 183, 77, 0.18);
  background: #fffdf9;
}

.manage-search-input::placeholder {
  color: #a08c72;
}

.settings-card {
  background: linear-gradient(180deg, #ffffff 0%, #fbf7f1 100%);
  border: 1px solid #f1e1cb;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 10px 24px rgba(211, 154, 72, 0.08);
}

.settings-card + .settings-card {
  margin-top: 12px;
}

.compact-settings-card {
  padding: 14px;
}

.compact-settings-card .settings-row {
  padding: 10px 0;
}

.component-settings-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.layout-settings-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.layout-option-card {
  align-items: center;
}

.layout-option-card > div:first-child {
  min-width: 0;
  flex: 1;
}

.layout-pill-switch {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  width: 104px;
  height: 34px;
  padding: 3px;
  border: 1px solid #d8c3a3;
  border-radius: 999px;
  background: #f4eadc;
  color: #7a5a32;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.layout-pill-switch::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(50% - 3px);
  height: calc(100% - 6px);
  border-radius: 999px;
  background: linear-gradient(180deg, #ffffff 0%, #fff7ea 100%);
  box-shadow: 0 2px 8px rgba(120, 76, 20, 0.18);
  transition: transform 0.22s ease, background 0.2s ease;
}

.layout-pill-switch.active::before {
  transform: translateX(100%);
  background: linear-gradient(180deg, #ffb347 0%, #ff9800 100%);
}

.layout-pill-switch:hover {
  border-color: #ff9800;
  box-shadow: 0 3px 10px rgba(255, 152, 0, 0.16);
}

.layout-pill-switch span {
  position: relative;
  z-index: 1;
  text-align: center;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.layout-pill-switch:not(.active) span:first-child,
.layout-pill-switch.active span:last-child {
  color: #4a3214;
}

.layout-pill-switch.active span:first-child,
.layout-pill-switch:not(.active) span:last-child {
  color: #9b7a4a;
}

@container (max-width: 860px) {
  .layout-settings-grid {
    gap: 8px;
  }

  .layout-option-card {
    align-items: flex-start;
    flex-direction: column;
    padding: 10px;
  }
}

.toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border: 1px solid #f1dfc3;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.84);
}

.toggle-card.disabled {
  opacity: 0.55;
}

.toggle-switch-input {
  width: 20px;
  height: 20px;
  accent-color: #ff9800;
  flex-shrink: 0;
}

.card-style-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 12px;
}

.card-style-settings-grid input[type="range"] {
  width: 100%;
}

.card-style-settings-grid .compact-form-group {
  padding: 12px;
  border: 1px solid #f1dfc3;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.78);
}

.card-style-settings-grid label {
  color: #4a3214;
  font-weight: 700;
}

.wallpaper-settings {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 14px;
  margin-top: 12px;
}

.wallpaper-preview {
  min-height: 220px;
  border-radius: 16px;
  border: 1px solid #f1dfc3;
  background: linear-gradient(135deg, #fff7eb 0%, #f7efe4 100%);
  overflow: hidden;
  position: relative;
}

.wallpaper-preview.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.wallpaper-placeholder {
  text-align: center;
  color: #8a6a39;
}

.wallpaper-placeholder-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.wallpaper-placeholder-text {
  font-size: 0.9rem;
}

.wallpaper-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wallpaper-action-row {
  display: flex;
  gap: 10px;
}

.wallpaper-url-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px;
  gap: 8px;
  align-items: center;
}

.wallpaper-refresh-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

.wallpaper-control-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.compact-form-group {
  margin-bottom: 0;
}

.compact-form-group label {
  margin-bottom: 8px;
}

.last-uploaded-wallpaper-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid #f1dfc3;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.last-uploaded-wallpaper-card:hover {
  transform: translateY(-1px);
  border-color: #ffb74d;
  box-shadow: 0 10px 20px rgba(255, 152, 0, 0.1);
}

.last-uploaded-wallpaper-preview {
  width: 84px;
  height: 56px;
  border-radius: 10px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.last-uploaded-wallpaper-meta {
  min-width: 0;
}

.last-uploaded-wallpaper-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #6f4a0d;
}

.last-uploaded-wallpaper-desc {
  margin-top: 4px;
  font-size: 0.78rem;
  line-height: 1.5;
  color: #8a6a39;
}

.wallpaper-hint {
  font-size: 0.8rem;
  line-height: 1.5;
  color: #8a6a39;
}

.data-management-intro {
  margin-bottom: 14px;
}

.data-management-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.data-management-group {
  padding: 14px;
  border: 1px solid #f1dfc3;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
}

.data-group-title {
  font-size: 0.96rem;
  font-weight: 700;
  color: #6f4a0d;
}

.data-group-desc {
  margin: 6px 0 12px;
  font-size: 0.82rem;
  line-height: 1.6;
  color: #86683b;
}

.danger-group {
  border-color: #f0c8c8;
  background: linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,245,245,0.92) 100%);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid #f1e8db;
}

.settings-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.settings-item-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: #333;
}

.settings-item-desc {
  margin-top: 4px;
  font-size: 0.8rem;
  color: #7a746b;
  line-height: 1.5;
}

.settings-inline-btn {
  white-space: nowrap;
  flex-shrink: 0;
}

.settings-actions-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.settings-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #f0d7b2;
  background: #fff;
  color: #6a4a16;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.settings-action-btn:hover {
  border-color: #ffb74d;
  background: #fff5e8;
  transform: translateY(-1px);
}

.settings-action-btn.danger {
  color: #c62828;
  border-color: #efc0c0;
}

.settings-action-btn.danger:hover {
  background: #fff1f0;
  border-color: #ef9a9a;
}

.export-data-dialog {
  max-width: 560px;
}

.export-dialog-note {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff6e8;
  border: 1px solid #f2d8ad;
  color: #8a6120;
  font-size: 0.83rem;
  line-height: 1.6;
}

.export-format-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.export-format-card {
  border: 1px solid #f0d7b2;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #fff8ef 100%);
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  text-align: left;
}

.export-format-card:hover {
  transform: translateY(-2px);
  border-color: #ffb74d;
  box-shadow: 0 10px 24px rgba(255, 152, 0, 0.14);
}

.export-format-icon {
  font-size: 1.5rem;
}

.export-format-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: #6a4a16;
}

.export-format-desc {
  font-size: 0.82rem;
  line-height: 1.5;
  color: #8a6a39;
}

.about-card {
  line-height: 1.7;
}

.about-line {
  margin-top: 10px;
  font-size: 0.88rem;
  color: #4a4a4a;
}

@media (max-width: 900px) {
  .settings-layout {
    flex-direction: column;
  }

  .settings-tabs {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #f0dfc8;
  }

  .settings-tabs.collapsed {
    width: 100%;
    padding: 10px;
    flex-direction: row;
    justify-content: center;
    flex-wrap: wrap;
  }

  .settings-nav-toggle {
    top: auto;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: 46px;
    height: 24px;
  }

  .settings-nav-toggle.collapsed {
    left: 50%;
  }

  .export-format-grid {
    grid-template-columns: 1fr;
  }

  .component-settings-grid,
  .card-style-settings-grid,
  .wallpaper-settings {
    grid-template-columns: 1fr;
  }

  .wallpaper-action-row {
    flex-direction: column;
  }
}

.manage-category-block {
  margin-bottom: 16px;
  background: #f8f8f8;
  border-radius: 6px;
  padding: 8px;
}

.manage-category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  position: relative;
}

.category-name-display {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
  padding: 4px 8px;
}

.item-count-badge {
  background: #e0e0e0;
  color: #666;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
}

.menu-icon-btn {
  background: transparent;
  border: none;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  color: #666;
  border-radius: 4px;
  transition: all 0.2s;
}

.menu-icon-btn:hover {
  background: rgba(0,0,0,0.05);
  color: #333;
}

.category-dropdown-menu,
.item-dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: linear-gradient(180deg, #ffffff 0%, #fbf6ee 100%);
  border: 1px solid #d9c7ad;
  border-radius: 8px;
  box-shadow: 0 12px 28px rgba(71, 47, 10, 0.18);
  z-index: 2400;
  min-width: 148px;
  overflow: hidden;
}

.dropdown-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 0.9rem;
  color: #2f2417;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dropdown-item:hover {
  background: #fff1dc;
}

.favorite-add-dropdown,
.favorite-remove-dropdown {
  font-weight: 700;
  border-radius: 8px;
  margin: 4px 6px;
  padding: 10px 12px;
}

.favorite-add-dropdown {
  background: #fff4e5;
  color: #d66a00;
}

.favorite-add-dropdown:hover {
  background: #ffe6bf;
}

.favorite-remove-dropdown {
  background: #fff1f0;
  color: #d84315;
}

.favorite-remove-dropdown:hover {
  background: #ffe1dd;
}

.dropdown-item.danger {
  color: #d32f2f;
}

.dropdown-item.danger:hover {
  background: #ffebee;
}

.manage-items-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.manage-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  position: relative;
  transition: background 0.2s, transform 0.2s;
  cursor: pointer;
  z-index: 0;
}

.manage-item:hover {
  background: #f5f5f5;
  transform: translateX(2px);
}

.manage-item.menu-open {
  z-index: 2200;
  background: linear-gradient(180deg, #fffdf8 0%, #fff3df 100%);
  box-shadow: 0 10px 22px rgba(71, 47, 10, 0.14);
  transform: none;
}

.manage-item.menu-open:hover {
  background: linear-gradient(180deg, #fffdf8 0%, #fff3df 100%);
  transform: none;
}

.manage-item-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.manage-item-icon img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.manage-item-name {
  flex: 1;
  font-size: 0.9rem;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* URL 提示框样式 */
.url-tooltip {
  position: fixed;
  background: rgba(0,0,0,0.92);
  color: white;
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 0.85rem;
  pointer-events: none;
  z-index: 2000;
  transform: translate(-50%, -100%);
  box-shadow: 0 8px 24px rgba(0,0,0,0.32);
  width: min(360px, calc(100vw - 24px));
  border: 1px solid rgba(255,255,255,0.08);
}

.url-tooltip.tooltip-bottom {
  transform: translate(-50%, 0);
}

.tooltip-mode {
  font-size: 0.76rem;
  color: #ffa726;
  margin-bottom: 10px;
  font-weight: 600;
}

.tooltip-section {
  margin-bottom: 10px;
}

.tooltip-section:last-child {
  margin-bottom: 0;
}

.tooltip-label {
  font-size: 0.72rem;
  color: #ffcc80;
  margin-bottom: 4px;
  font-weight: 700;
}

.tooltip-url {
  color: white;
  white-space: normal;
  word-break: break-word;
  line-height: 1.45;
}

.tooltip-note {
  color: #f0f0f0;
  white-space: normal;
  word-break: break-word;
  line-height: 1.5;
}

.page-toast {
  position: fixed;
  left: 50%;
  top: 18px;
  transform: translateX(-50%);
  min-width: 220px;
  max-width: min(560px, calc(100vw - 32px));
  padding: 11px 18px;
  border-radius: 14px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.96);
  color: #243041;
  font-size: 0.84rem;
  font-weight: 600;
  line-height: 1.5;
  text-align: center;
  white-space: pre-line;
  word-break: break-word;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.14);
  z-index: 3000;
  pointer-events: none;
  backdrop-filter: blur(10px);
  animation: toast-slide-in 0.22s ease;
}

.toast-success {
  border-color: rgba(34, 197, 94, 0.22);
  background: rgba(240, 253, 244, 0.97);
  color: #166534;
}

.toast-warning {
  border-color: rgba(245, 158, 11, 0.22);
  background: rgba(255, 251, 235, 0.98);
  color: #92400e;
}

.toast-error {
  border-color: rgba(239, 68, 68, 0.22);
  background: rgba(254, 242, 242, 0.98);
  color: #b91c1c;
}

@keyframes toast-slide-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.action-btn {
  background: rgba(0,0,0,0.05);
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(0,0,0,0.1);
  transform: scale(1.1);
}

.favorite-heart-action {
  border-radius: 999px;
  width: 34px;
  height: 34px;
  padding: 0;
  font-size: 1rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.favorite-heart-action {
  background: linear-gradient(135deg, #fff3e0 0%, #ffdca8 100%);
  color: #d66a00;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.18);
}

.favorite-heart-action:hover {
  background: linear-gradient(135deg, #ffe8c7 0%, #ffcc80 100%);
  transform: translateY(-1px) scale(1.03);
}

.favorite-heart-action.is-active {
  background: linear-gradient(135deg, #fff1f0 0%, #ffd7d1 100%);
  color: #d84315;
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.12);
}

.favorite-heart-action.is-active:hover {
  background: linear-gradient(135deg, #ffe3df 0%, #ffbeb3 100%);
  transform: translateY(-1px) scale(1.03);
}

/* 滚动条样式 */
.content::-webkit-scrollbar,
.dialog-body::-webkit-scrollbar {
  width: 8px;
}

.content::-webkit-scrollbar-track,
.dialog-body::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.content::-webkit-scrollbar-thumb,
.dialog-body::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.content::-webkit-scrollbar-thumb:hover,
.dialog-body::-webkit-scrollbar-thumb:hover {
  background: #999;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
  color: #333;
}

.empty-message {
  font-size: 16px;
  margin-bottom: 8px;
  line-height: 1.5;
  color: #666;
}

.empty-highlight {
  color: #ff9800;
  font-weight: bold;
}

/* 浏览器HTML导入样式 */
.file-upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 8px;
}

.file-upload-area:hover {
  border-color: #ff9800;
  background-color: rgba(255, 152, 0, 0.05);
}

.file-upload-placeholder {
  color: #666;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.upload-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 14px;
  color: #999;
}

.file-upload-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: #f8f8f8;
  border-radius: 6px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 32px;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.file-size {
  font-size: 12px;
  color: #666;
}

.import-mode-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.radio-option {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-option:hover {
  border-color: #ff9800;
  background-color: rgba(255, 152, 0, 0.05);
}

.radio-option input[type="radio"] {
  margin-right: 8px;
}

.radio-label {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.radio-description {
  font-size: 12px;
  color: #666;
  margin-left: 20px;
}

.new-category-input {
  margin-top: 8px;
}

.import-preview {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 16px;
  margin-top: 8px;
  background-color: #f8f8f8;
}

.preview-header {
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.preview-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.preview-stat {
  font-size: 14px;
  color: #555;
  padding: 6px 8px;
  background-color: white;
  border-radius: 4px;
}

/* 暗黑模式下的浏览器导入样式 */
.dark-mode .file-upload-area {
  border-color: #3a3a3a;
  background-color: #2d2d2d;
}

.dark-mode .file-upload-area:hover {
  border-color: #ff9800;
  background-color: rgba(255, 152, 0, 0.1);
}

.dark-mode .file-upload-placeholder {
  color: #b0b0b0;
}

.dark-mode .file-upload-selected {
  background-color: #3a3a3a;
}

.dark-mode .file-name {
  color: #e0e0e0;
}

.dark-mode .file-size {
  color: #999;
}

.dark-mode .radio-option {
  border-color: #3a3a3a;
  background-color: #2d2d2d;
}

.dark-mode .radio-option:hover {
  border-color: #ff9800;
  background-color: rgba(255, 152, 0, 0.1);
}

.dark-mode .radio-label {
  color: #e0e0e0;
}

.dark-mode .radio-description {
  color: #b0b0b0;
}

.dark-mode .import-preview {
  border-color: #3a3a3a;
  background-color: #2d2d2d;
}

.dark-mode .preview-header {
  color: #e0e0e0;
  border-bottom-color: #3a3a3a;
}

.dark-mode .preview-stat {
  color: #e0e0e0;
  background-color: #3a3a3a;
}

/* ============================================================
   【新增功能 8】服务连通性检测 —— 新增样式
   只新增类，不修改任何现有样式。颜色规范：在线绿 / 离线红 / 超时橙 / 检测中灰 / 未检测灰空心。
   ============================================================ */

/* 全局关闭：隐藏所有 health 元素（行为与未安装该功能一致由模板上的 healthFeatureOn 守卫保证） */

/* 状态颜色基础变量（dot / 竖线 / 历史块共用） */
.health-online { --health-color: #2ecc71; --health-color-soft: rgba(46, 204, 113, 0.18); --health-color-ring: rgba(46, 204, 113, 0.35); }
.health-offline { --health-color: #e74c3c; --health-color-soft: rgba(231, 76, 60, 0.18); --health-color-ring: rgba(231, 76, 60, 0.35); }
.health-timeout { --health-color: #f39c12; --health-color-soft: rgba(243, 156, 18, 0.18); --health-color-ring: rgba(243, 156, 18, 0.35); }
.health-checking { --health-color: #95a5a6; --health-color-soft: rgba(149, 165, 166, 0.18); --health-color-ring: rgba(149, 165, 166, 0.35); }
.health-unknown { --health-color: #b0b0b0; --health-color-soft: transparent; --health-color-ring: rgba(176, 176, 176, 0.3); }

/* 状态小圆点 */
.health-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
  flex-shrink: 0;
  vertical-align: middle;
  background: var(--health-color, #b0b0b0);
  box-shadow: 0 0 0 2px var(--health-color-ring, transparent);
}
.health-health-unknown .health-dot,
.health-unknown .health-dot,
.health-dot.health-unknown {
  background: transparent;
  border: 1.5px solid var(--health-color, #b0b0b0);
  box-shadow: none;
}
.health-dot.health-checking {
  background: var(--health-color, #95a5a6);
}
.health-dot-small {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  vertical-align: middle;
  background: var(--health-color, #b0b0b0);
  margin-right: 3px;
}
.health-dot-small.health-unknown { background: transparent; border: 1.2px solid #b0b0b0; }

/* 检测中旋转动画 */
.health-checking .health-dot,
.health-dot.health-checking {
  animation: health-spin 0.9s linear infinite;
}
@keyframes health-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.health-spinner-mini {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(149, 165, 166, 0.35);
  border-top-color: #95a5a6;
  border-radius: 50%;
  animation: health-spin 0.8s linear infinite;
  vertical-align: middle;
}

/* 仅看异常模式下隐藏普通分类与收藏区（用根 class 控制，不改现有结构） */
.navigation-panel.health-only-abnormal .favorites-section,
.navigation-panel.health-only-abnormal .category-section {
  display: none;
}

/* ===== 顶部全局 badge ===== */
.health-global-badge {
  position: relative;
  min-width: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.health-global-badge .health-badge-ok { color: #2ecc71; font-weight: 700; font-size: 0.95rem; }
.health-global-badge .health-badge-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  border: 1.5px solid #b0b0b0;
  color: #8a8a8a;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
}
.health-global-badge.health-badge-empty-state { opacity: 0.72; }
.health-global-badge .health-badge-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: #e74c3c;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
}
.health-global-badge.health-badge-all-online .health-badge-num { background: #2ecc71; }
.health-global-badge.health-badge-checking { opacity: 0.85; }

/* ===== 仅看异常筛选按钮 ===== */
.health-abnormal-filter-btn {
  margin-left: 10px;
  background: rgba(243, 156, 18, 0.12);
  border-color: rgba(243, 156, 18, 0.4);
}
.health-abnormal-filter-btn.is-active {
  background: rgba(243, 156, 18, 0.28);
  border-color: #f39c12;
  color: #b9770a;
}
.health-abnormal-filter-icon { margin-right: 5px; }
.health-abnormal-filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  margin-left: 6px;
  border-radius: 8px;
  background: #e74c3c;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
}

/* ===== 仅看异常聚合区 ===== */
.health-abnormal-section {
  margin-bottom: 18px;
  padding: 14px;
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 14px;
  background: rgba(231, 76, 60, 0.06);
}
.health-abnormal-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-weight: 700;
}
.health-abnormal-title { color: #c0392b; }
.health-abnormal-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: #e74c3c;
  color: #fff;
  font-size: 0.75rem;
}
.health-abnormal-list { display: flex; flex-direction: column; gap: 6px; }
.health-abnormal-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  border-left: 3px solid var(--health-color, #b0b0b0);
}
.health-abnormal-item:hover { background: rgba(255, 255, 255, 0.92); }
.health-abnormal-item-name { font-weight: 600; flex-shrink: 0; }
.health-abnormal-item-path { color: #888; font-size: 0.82rem; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.health-abnormal-item-status { font-size: 0.82rem; color: var(--health-color, #b0b0b0); flex-shrink: 0; }
.health-abnormal-empty { color: #2ecc71; font-weight: 600; padding: 6px 2px; }

/* ===== 分类标题健康概览 + 检测按钮 ===== */
.category-health-overview {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 1px 7px;
  border-radius: 9px;
  font-size: 0.72rem;
  background: rgba(176, 176, 176, 0.14);
  color: #888;
}
.category-health-overview.health-overview-ok { background: rgba(46, 204, 113, 0.14); color: #27ae60; }
.category-health-overview.health-overview-abnormal { background: rgba(231, 76, 60, 0.14); color: #c0392b; }
.health-overview-text { font-weight: 600; }
.category-health-check-btn {
  margin-left: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: 0.6;
  transition: opacity 0.15s;
}
.category-health-check-btn:hover { opacity: 1; }

/* ===== 网格卡片状态徽标 ===== */
.item-card { position: relative; }
.item-card-health-bar {
  position: absolute;
  left: 9px;
  top: 9px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--health-color, #b0b0b0);
  box-shadow:
    0 0 0 3px var(--health-color-soft, rgba(176, 176, 176, 0.16)),
    0 2px 8px var(--health-color-ring, rgba(176, 176, 176, 0.25));
  z-index: 3;
}
.item-card-health-bar::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: inherit;
  background: rgba(255, 255, 255, 0.75);
}
.health-checking .item-card-health-bar,
.item-card-health-bar.health-checking {
  animation: health-breathe 1.4s ease-in-out infinite;
}
@keyframes health-breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.health-card-offline { opacity: 0.9; }
.health-card-offline .item-content,
.health-card-offline .item-icon { opacity: 0.9; }

/* 网格右键菜单：重新检测 */
.health-recheck-menu-item:hover { background: rgba(46, 204, 113, 0.12); }

/* ===== 列表条目状态 tag ===== */
.health-status-tag {
  display: inline-flex;
  align-items: center;
  margin-left: 6px !important;
  padding: 1px 7px !important;
  border-radius: 9px !important;
  font-size: 0.72rem !important;
  background: var(--health-color-soft, transparent);
  color: var(--health-color, #b0b0b0);
  border: 1px solid var(--health-color-ring, transparent) !important;
}
.health-status-tag .health-dot { width: 6px; height: 6px; margin-right: 4px; }
.health-status-text { font-weight: 600; }
.health-latency-text { margin-left: 4px; opacity: 0.85; font-variant-numeric: tabular-nums; }

/* ===== Tooltip 健康区块 ===== */
.tooltip-divider {
  height: 1px;
  margin: 10px 0 8px;
  background: linear-gradient(to right, transparent, rgba(128, 128, 128, 0.35), transparent);
}
.health-tooltip-block .tooltip-label { margin-bottom: 6px; }
.health-tooltip-status {
  display: flex;
  align-items: center;
  font-size: 0.86rem;
  margin-bottom: 6px;
  color: var(--health-color, #b0b0b0);
  font-weight: 600;
}
.health-tooltip-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  margin-top: 3px;
  color: #888;
}
.health-tooltip-field-label { color: #999; }
.health-tooltip-field-value { color: #666; font-variant-numeric: tabular-nums; }
.health-tooltip-history { margin-top: 8px; }
.health-history-blocks { display: inline-flex; gap: 3px; margin-left: 6px; vertical-align: middle; flex-wrap: wrap; max-width: 180px; }
.health-history-block {
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 3px;
  background: var(--health-color, #b0b0b0);
}
.health-history-block.health-unknown { background: transparent; border: 1px solid #b0b0b0; }
.dark-mode .health-tooltip-field-value { color: #ccc; }
.dark-mode .health-tooltip-row { color: #aaa; }

/* ===== 编辑弹窗连通配置折叠区 ===== */
.health-edit-section { margin-top: 4px; }
.health-edit-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  margin: 0 -2px;
  border-radius: 10px;
  background: rgba(46, 204, 113, 0.06);
  cursor: pointer;
  user-select: none;
}
.health-edit-header:hover { background: rgba(46, 204, 113, 0.12); }
.health-edit-title { font-weight: 600; }
.health-edit-body { padding: 12px 4px 0; }
.health-edit-toggle { margin-bottom: 12px; }
.health-edit-timeout-row { display: flex; flex-direction: column; gap: 10px; }
.health-edit-radio { align-items: center; gap: 8px; }
.health-edit-radio .radio-label { min-width: 110px; }
.health-edit-timeout-input {
  width: 90px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.85rem;
}
.health-edit-timeout-input:disabled { background: #f5f5f5; opacity: 0.6; }

/* ===== 设置面板 health 行 ===== */
.health-select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.88rem;
  min-width: 160px;
}
.health-number-input {
  width: 90px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.88rem;
}
.health-action-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.health-category-dropdown {
  position: relative;
  width: 100%;
}
.health-category-dropdown-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: #fff;
  color: #333;
  cursor: pointer;
  font-size: 0.88rem;
  text-align: left;
}
.health-category-trigger-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.health-category-trigger-arrow {
  flex: 0 0 auto;
  color: #888;
  font-size: 0.72rem;
}
.health-category-dropdown-panel {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 80;
  padding: 8px;
  border: 1px solid rgba(128, 128, 128, 0.22);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.14);
}
.health-category-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  margin: 0 0 8px;
}
.health-category-summary {
  flex: 1;
  min-width: 0;
  color: #777;
  font-size: 0.82rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.health-mini-btn {
  flex: 0 0 auto;
  padding: 4px 10px;
  font-size: 0.78rem;
  border-radius: 8px;
  white-space: nowrap;
}
.health-category-select-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow: auto;
}
.health-category-select-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 70px 68px;
  align-items: center;
  column-gap: 8px;
  min-height: 34px;
  padding: 7px 9px;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.health-category-select-item input {
  width: 14px;
  height: 14px;
  margin: 0;
  justify-self: start;
}
.health-category-select-item:hover { background: rgba(255, 152, 0, 0.08); }
.health-category-select-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.health-category-select-count {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #888;
  font-size: 0.78rem;
  text-align: right;
}
.health-category-config-badge {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  text-align: center;
  background: rgba(128, 128, 128, 0.12);
  color: #777;
}
.health-category-enabled { border-color: rgba(46, 204, 113, 0.35); background: rgba(46, 204, 113, 0.08); }
.health-category-enabled .health-category-config-badge { background: rgba(46, 204, 113, 0.18); color: #229954; }
.health-category-disabled { border-color: rgba(231, 76, 60, 0.28); background: rgba(231, 76, 60, 0.06); }
.health-category-disabled .health-category-config-badge { background: rgba(231, 76, 60, 0.16); color: #c0392b; }
.health-category-inherited { border-color: rgba(52, 152, 219, 0.3); background: rgba(52, 152, 219, 0.07); }
.health-category-inherited .health-category-config-badge { background: rgba(52, 152, 219, 0.16); color: #2874a6; }
.health-divider { height: 1px; margin: 16px 0; background: rgba(128, 128, 128, 0.2); }
.health-settings-tab { border-top: 1px dashed rgba(128, 128, 128, 0.25); }

/* 探测模式提示 */
.health-mode-hint {
  margin: 0 0 14px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.8rem;
  line-height: 1.5;
  background: rgba(52, 152, 219, 0.08);
  color: #2980b9;
  border: 1px solid rgba(52, 152, 219, 0.2);
}
.health-mode-hint.health-mode-browser {
  background: rgba(243, 156, 18, 0.08);
  color: #b9770a;
  border-color: rgba(243, 156, 18, 0.25);
}

/* ===== dark mode 适配 ===== */
.dark-mode .health-abnormal-item { background: rgba(255, 255, 255, 0.05); }
.dark-mode .health-abnormal-item:hover { background: rgba(255, 255, 255, 0.1); }
.dark-mode .category-health-overview { background: rgba(255, 255, 255, 0.08); color: #bbb; }
.dark-mode .health-status-tag { background: var(--health-color-soft, transparent); }
.dark-mode .health-edit-header { background: rgba(46, 204, 113, 0.1); }
.dark-mode .health-edit-timeout-input,
.dark-mode .health-select,
.dark-mode .health-number-input {
  background: rgba(255, 255, 255, 0.08);
  color: #eee;
  border-color: rgba(255, 255, 255, 0.18);
}
.dark-mode .health-abnormal-item-path { color: #999; }
.dark-mode .health-category-dropdown-trigger,
.dark-mode .health-category-dropdown-panel {
  background: #1f252d;
  color: #f2f4f6;
  border-color: rgba(255, 255, 255, 0.26);
}
.dark-mode .health-category-dropdown-panel { box-shadow: 0 14px 32px rgba(0, 0, 0, 0.48); }
.dark-mode .health-category-trigger-arrow,
.dark-mode .health-category-summary,
.dark-mode .health-category-select-count { color: #c7ccd1; }
.dark-mode .health-category-select-name { color: #f3f5f7; }
.dark-mode .health-category-config-badge { background: rgba(255, 255, 255, 0.14); color: #d7dce0; }
.dark-mode .health-category-select-item { border-color: rgba(255, 255, 255, 0.08); }
.dark-mode .health-category-select-item:hover { background: rgba(255, 152, 0, 0.18); }
.dark-mode .health-category-enabled { background: rgba(46, 204, 113, 0.18); border-color: rgba(46, 204, 113, 0.48); }
.dark-mode .health-category-enabled .health-category-config-badge { background: rgba(46, 204, 113, 0.28); color: #7ee2a8; }
.dark-mode .health-category-disabled { background: rgba(231, 76, 60, 0.16); border-color: rgba(231, 76, 60, 0.42); }
.dark-mode .health-category-disabled .health-category-config-badge { background: rgba(231, 76, 60, 0.26); color: #ff9b91; }
.dark-mode .health-category-inherited { background: rgba(52, 152, 219, 0.18); border-color: rgba(52, 152, 219, 0.42); }
.dark-mode .health-category-inherited .health-category-config-badge { background: rgba(52, 152, 219, 0.28); color: #8fd0ff; }
.dark-mode .card-style-settings-grid .compact-form-group {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.2);
}
.dark-mode .card-style-settings-grid label { color: #f5d29a; }
.dark-mode .card-style-settings-grid .settings-item-desc { color: #d4d8dd; }
.dark-mode .card-style-settings-grid input[type="range"] { accent-color: #ffb74d; }
.dark-mode .item-card-health-bar::after { background: rgba(31, 37, 45, 0.86); }
</style>


