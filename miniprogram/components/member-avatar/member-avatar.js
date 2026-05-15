Component({
  properties: {
    src: { type: String, value: '' },
    size: { type: String, value: 'medium' }
  },
  data: {
    showDefault: false
  },
  observers: {
    'src': function(val) {
      this.setData({ showDefault: !val })
    }
  },
  methods: {
    onError() {
      this.setData({ showDefault: true })
    }
  }
})
