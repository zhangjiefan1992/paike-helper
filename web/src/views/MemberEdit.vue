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
const form = reactive({ id: '', name: '', phone: '', notes: '' })

onMounted(() => {
  if (route.params.id) {
    const member = storage.getMemberById(route.params.id)
    if (member) {
      isEdit.value = true
      Object.assign(form, member)
    }
  }
})

function onSave() {
  if (!form.name.trim()) { showToast('请输入姓名'); return }

  if (!form.id) {
    form.id = generateMemberId()
    form.createdAt = Date.now()
    form.updatedAt = Date.now()
  }

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
.form-actions { padding: 24px 16px; }
</style>
