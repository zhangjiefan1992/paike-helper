const storage = require('../../utils/storage')

Page({
  data: {
    members: [],
    filteredMembers: [],
    searchKeyword: '',
    isEmpty: true
  },

  onShow() {
    this.loadMembers()
  },

  onPullDownRefresh() {
    this.loadMembers()
    wx.stopPullDownRefresh()
  },

  loadMembers() {
    const members = storage.getMembers()
    const sessions = storage.getSessions()

    const enriched = members.map(m => {
      const memberSessions = sessions.filter(
        s => s.memberId === m.id || (s.memberIds && s.memberIds.includes(m.id))
      )
      const sorted = memberSessions.sort((a, b) => b.date.localeCompare(a.date))
      return {
        ...m,
        totalSessions: memberSessions.length,
        lastSessionDate: sorted.length > 0 ? sorted[0].date : null,
        _sortKey: sorted.length > 0 ? sorted[0].date : '0000-00-00'
      }
    }).sort((a, b) => b._sortKey.localeCompare(a._sortKey))

    this.setData({
      members: enriched,
      filteredMembers: this.filterByKeyword(enriched, this.data.searchKeyword),
      isEmpty: enriched.length === 0
    })
  },

  filterByKeyword(members, keyword) {
    if (!keyword) return members
    const kw = keyword.toLowerCase()
    return members.filter(m => m.name.toLowerCase().includes(kw))
  },

  onSearch(e) {
    const keyword = e.detail.value
    this.setData({
      searchKeyword: keyword,
      filteredMembers: this.filterByKeyword(this.data.members, keyword)
    })
  },

  onMemberTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/member-detail/member-detail?id=${id}` })
  },

  onGoStats() {
    wx.navigateTo({ url: '/pages/stats/stats' })
  },

  onAddMember() {
    wx.navigateTo({ url: '/pages/member-edit/member-edit' })
  }
})
