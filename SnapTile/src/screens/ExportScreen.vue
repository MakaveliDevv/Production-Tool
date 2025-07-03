<template>
  <div class="export-screen">
    <!-- Toolbar with Start + conditional Return -->
    <header class="toolbar">
      <button class="nav-btn" @click="$emit('go-start')">← Start</button>
      <button
        v-if="origin === 'editor'"
        class="nav-btn"
        @click="$emit('go-editor')"
      >← Return</button>
    </header>

    <h2>Export Settings</h2>
    <button @click="doExport">Export</button>
  </div>
</template>

<script>
export default {
  props: {
    settings: Object,
    image:    Object,
    origin: {
      type: String,
      default: 'start'
    }
  },
  methods: {
    async doExport() {
      const buffer = await renderCanvasToBlob(this.settings, this.image)
      await window.electronAPI.exportFile(buffer, 'tileset.png')
      alert('Exported!')
      this.$emit('done-export')
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 1rem;
  padding: 1rem;
}
.nav-btn {
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>
