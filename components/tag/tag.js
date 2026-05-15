Component({
  properties: {
    text: { type: String, value: '' },
    selected: { type: Boolean, value: false },
    closable: { type: Boolean, value: false }
  },
  methods: {
    onTap() {
      this.triggerEvent('select', { text: this.data.text })
    },
    onClose(e) {
      e.stopPropagation()
      this.triggerEvent('close', { text: this.data.text })
    }
  }
})
