Component({
  properties: {
    session: { type: Object, value: {} },
    memberName: { type: String, value: '' },
    compact: { type: Boolean, value: false },
    showDot: { type: Boolean, value: false },
    dotType: { type: String, value: 'pending' }  // 'pending' | 'done'
  },
  data: {
    slideX: 0
  },
  methods: {
    onTap() {
      this.triggerEvent('cardtap', { id: this.data.session.id })
    },
    onSlideChange(e) {
      this.setData({ slideX: e.detail.x })
    },
    onComplete() {
      this.setData({ slideX: 0 })
      this.triggerEvent('complete', { id: this.data.session.id })
    },
    onCancel() {
      this.setData({ slideX: 0 })
      this.triggerEvent('cancel', { id: this.data.session.id })
    }
  }
})
