// 会员上课明细导出文本生成

const STATUS_TEXT = {
  scheduled: '待上课',
  completed: '已完成',
  cancelled: '已取消',
  noshow: '未出勤'
}

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六']

function fmtDate(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  const date = new Date(s + 'T00:00:00')
  return `${y}-${m}-${d} 周${WEEKDAY[date.getDay()]}`
}

export function buildMemberStats(member, sessions) {
  const all = sessions || []
  const completed = all.filter(s => s.status === 'completed')
  const cancelled = all.filter(s => s.status === 'cancelled')
  const noshow = all.filter(s => s.status === 'noshow')
  const scheduled = all.filter(s => s.status === 'scheduled')

  const cancelRate = (cancelled.length + noshow.length) / Math.max(1, completed.length + cancelled.length + noshow.length)
  const attendRate = completed.length / Math.max(1, completed.length + cancelled.length + noshow.length)

  // 活跃跨度
  let firstDate = null, lastDate = null
  all.forEach(s => {
    if (s.status === 'cancelled') return
    if (!firstDate || s.date < firstDate) firstDate = s.date
    if (!lastDate || s.date > lastDate) lastDate = s.date
  })

  let monthsActive = 0
  if (firstDate && lastDate) {
    const f = new Date(firstDate + 'T00:00:00')
    const l = new Date(lastDate + 'T00:00:00')
    monthsActive = Math.max(1, (l.getFullYear() - f.getFullYear()) * 12 + (l.getMonth() - f.getMonth()) + 1)
  }
  const avgPerMonth = monthsActive > 0 ? (completed.length / monthsActive) : 0

  return {
    total: all.length,
    completed: completed.length,
    cancelled: cancelled.length,
    noshow: noshow.length,
    scheduled: scheduled.length,
    attendRate,
    cancelRate,
    monthsActive,
    avgPerMonth,
    firstDate,
    lastDate
  }
}

export function exportMemberDetail(member, sessions) {
  if (!member) return ''
  const stats = buildMemberStats(member, sessions)

  const lines = []
  lines.push(`${member.name} · 课程明细`)
  lines.push('—'.repeat(20))
  if (member.phone) lines.push(`联系：${member.phone}`)
  if (member.tags?.length) lines.push(`标签：${member.tags.join('、')}`)
  if (member.notes) {
    lines.push('')
    lines.push('备注：')
    lines.push(member.notes)
  }

  lines.push('')
  lines.push(`【统计】`)
  lines.push(`累计上课：${stats.completed} 节（共 ${stats.total} 次记录）`)
  if (stats.cancelled > 0) lines.push(`取消：${stats.cancelled} 次`)
  if (stats.noshow > 0) lines.push(`爽约：${stats.noshow} 次`)
  if (stats.scheduled > 0) lines.push(`待上：${stats.scheduled} 节`)
  lines.push(`出勤率：${(stats.attendRate * 100).toFixed(0)}%`)
  if (stats.monthsActive > 1) {
    lines.push(`平均每月：${stats.avgPerMonth.toFixed(1)} 节（活跃 ${stats.monthsActive} 个月）`)
  }
  if (stats.firstDate) lines.push(`首次：${stats.firstDate}`)
  if (stats.lastDate) lines.push(`最近：${stats.lastDate}`)

  // 课程类型分布
  const typeCount = {}
  sessions.forEach(s => {
    if (s.status === 'cancelled' || !s.courseType) return
    typeCount[s.courseType] = (typeCount[s.courseType] || 0) + 1
  })
  const typeArr = Object.entries(typeCount).sort((a, b) => b[1] - a[1])
  if (typeArr.length) {
    lines.push('')
    lines.push(`【课程类型】`)
    typeArr.forEach(([k, v]) => lines.push(`  ${k}：${v} 次`))
  }

  // 训练重点
  const faCount = {}
  sessions.forEach(s => {
    if (s.status === 'cancelled') return
    ;(s.focusAreas || []).forEach(a => { faCount[a] = (faCount[a] || 0) + 1 })
  })
  const faArr = Object.entries(faCount).sort((a, b) => b[1] - a[1]).slice(0, 8)
  if (faArr.length) {
    lines.push('')
    lines.push(`【常练部位】`)
    lines.push(`  ${faArr.map(([k, v]) => `${k}(${v})`).join('、')}`)
  }

  // 逐次明细（按时间倒序）
  const sorted = [...sessions].sort((a, b) => {
    const ka = `${a.date} ${a.startTime || '00:00'}`
    const kb = `${b.date} ${b.startTime || '00:00'}`
    return kb.localeCompare(ka)
  })

  if (sorted.length) {
    lines.push('')
    lines.push(`【逐次明细（最近在前）】`)
    sorted.forEach((s, i) => {
      const head = `${fmtDate(s.date)}${s.startTime ? ' ' + s.startTime : ''} · ${s.courseType || '课程'}`
      const status = STATUS_TEXT[s.status] || ''
      const loc = s.location ? ` · ${s.location}` : ''
      lines.push('')
      lines.push(`${i + 1}. ${head}${loc}  [${status}]`)
      if (s.duration) lines.push(`   时长：${s.duration} 分钟`)
      if (s.focusAreas?.length) lines.push(`   重点：${s.focusAreas.join('、')}`)
      if (s.aiDigest && s.aiDigest.trim()) {
        lines.push(`   档案：${s.aiDigest.replace(/\n+/g, ' ').trim()}`)
      } else if (s.notes && s.notes.trim()) {
        lines.push(`   备注：${s.notes.replace(/\n+/g, ' ').trim()}`)
      }
    })
  }

  lines.push('')
  lines.push(`—— 由排课助手 (keleya.org) 导出于 ${new Date().toLocaleDateString('zh-CN')}`)
  return lines.join('\n')
}
