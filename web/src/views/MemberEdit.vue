<template>
  <div class="edit-page">
    <van-nav-bar :title="isEdit ? '编辑会员' : '新增会员'" left-arrow @click-left="$router.back()">
      <template #right v-if="isEdit">
        <span class="delete-btn" @click="onDelete">删除</span>
      </template>
    </van-nav-bar>

    <van-form @submit="onSave">
      <van-cell-group inset>
        <van-field v-model="form.name" label="姓名" required placeholder="会员姓名" />
        <van-field v-model="form.phone" label="手机" type="tel" placeholder="手机号码（选填）" />
      </van-cell-group>

      <van-cell-group inset title="标签">
        <div class="tags-section">
          <div class="tag-list">
            <span v-for="(tag, i) in form.tags" :key="tag" class="member-tag">
              {{ tag }}
              <span class="member-tag__delete" @click="removeTag(i)">×</span>
            </span>
            <span v-if="!form.tags.length" class="tags-empty">添加标签如"VIP""腰伤注意""新手"</span>
          </div>
          <div class="add-row">
            <input v-model="tagInput" class="add-row__input" placeholder="输入标签"
              @keyup.enter="addTag" />
            <span class="add-row__btn" @click="addTag">添加</span>
          </div>
        </div>
      </van-cell-group>

      <van-cell-group inset>
        <van-field v-model="form.notes" label="备注" type="textarea" rows="3"
          autosize placeholder="备注信息..." />
      </van-cell-group>

      <div class="form-actions">
        <van-button block round type="primary" native-type="submit" color="#4A7C59">
          {{ isEdit ? '保存修改' : '添加会员' }}
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import * as storage from '../services/storage'
import { generateMemberId } from '../utils/idGenerator'

const route = useRoute()
const router = useRouter()
const isEdit = ref(false)
const tagInput = ref('')
const form = reactive({ id: '', name: '', phone: '', notes: '', tags: [] })

onMounted(() => {
  if (route.params.id) {
    const member = storage.getMemberById(route.params.id)
    if (member) {
      isEdit.value = true
      Object.assign(form, { ...member, tags: member.tags || [] })
    }
  }
})

function addTag() {
  const val = tagInput.value.trim()
  if (!val) return
  if (form.tags.includes(val)) {
    showToast('标签已存在')
    return
  }
  form.tags.push(val)
  tagInput.value = ''
}

function removeTag(index) {
  form.tags.splice(index, 1)
}

function onSave() {
  if (!form.name.trim()) { showToast('请输入姓名'); return }

  if (!form.id) {
    form.id = generateMemberId()
    form.createdAt = Date.now()
  }
  form.updatedAt = Date.now()

  storage.saveMember({ ...form })
  showToast({ message: isEdit.value ? '已保存' : '添加成功', type: 'success' })
  setTimeout(() => router.back(), 500)
}

function onDelete() {
  showConfirmDialog({ title: '确认删除', message: `确定删除会员「${form.name}」？` })
    .then(() => {
      storage.deleteMember(form.id)
      showToast('已删除')
      setTimeout(() => router.back(), 500)
    })
    .catch(() => {})
}
</script>

<style scoped>
.edit-page { background: var(--bg-page); min-height: 100vh; }
.delete-btn { color: #e74c3c; font-size: 14px; }

.tags-section { padding: 12px 16px; }

.tag-list { display: flex; flex-wrap: wrap; gap: 8px; min-height: 32px; }

.member-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: var(--radius-pill);
  background: var(--color-primary-light); color: var(--color-primary);
  font-size: 13px; font-weight: 500;
}

.member-tag__delete {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  font-size: 12px; line-height: 1; cursor: pointer;
  color: var(--color-primary); opacity: 0.6;
}
.member-tag__delete:hover { opacity: 1; }

.tags-empty { font-size: 13px; color: var(--text-muted); line-height: 32px; }

.add-row {
  display: flex; align-items: center; gap: 8px; margin-top: 10px;
}

.add-row__input {
  flex: 1; height: 34px; padding: 0 12px;
  border: 1px solid var(--bg-hairline); border-radius: var(--radius-pill);
  font-size: 13px; background: var(--bg-input); color: var(--text-primary);
  outline: none;
}
.add-row__input:focus { border-color: var(--color-primary); }

.add-row__btn {
  padding: 6px 14px; border-radius: var(--radius-pill);
  background: var(--color-primary); color: #fff;
  font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
}
.add-row__btn:active { opacity: 0.8; }

.form-actions { padding: 24px 16px; }
</style>
