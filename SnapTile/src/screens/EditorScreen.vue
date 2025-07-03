<template>
  <div class="editor-screen">
    <!-- Top toolbar: Save & Load only -->
    <header class="toolbar">
      <button
        :disabled="!settings.exportWidth || !settings.exportHeight"
        @click="saveAsPng"
      >
        Save
      </button>
      <button @click="loadProjectFile">Load</button>
    </header>

    <!-- Main area: SettingsPanel + Start + Preview -->
    <div class="app-container">
      <div class="sidebar">
        <SettingsPanel
          v-model:settings="settings"
          v-model:perTileSettings="perTileSettings"
          :selectedTiles="selectedTiles"
        />
        <button class="back" @click="$emit('go-start')">← Start</button>
      </div>

      <TexturePreview
        ref="texturePreview"
        v-model:selectedTiles="selectedTiles"
        v-model:settings="settings"
        :imageUrl="imageUrl"
        :perTileSettings="perTileSettings"
        @update:settings="settings = $event"
      />
    </div>
  </div>
</template>

<script>
import SettingsPanel  from '../components/SettingsPanel.vue';
import TexturePreview from '../components/TexturePreview.vue';

export default {
  name: 'EditorScreen',
  components: { SettingsPanel, TexturePreview },
  props: {
    projectFile: String
  },
  data() {
    return {
      settings: {
        tileWidth: 32,
        tileHeight: 32,
        gridSize: 32,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        scale: 1,
        brightness: 0,
        contrast: 0,
        blur: 0,
        filterMethod: 'none',
        filterStrength: 0,
        showGrid: true,
        exportWidth: null,
        exportHeight: null
      },
      perTileSettings: {},
      selectedTiles: [],
      imageUrl: null,
      imagePath: null
    };
  },
  async created() {
    await this.loadProject(this.projectFile);
  },
  methods: {
    // save renders at chosen resolution with tint
    async saveAsPng() {
      try {
        const blob = await this.$refs.texturePreview.exportBlob();
        const buf  = new Uint8Array(await blob.arrayBuffer());
        const saved = await window.electronAPI.exportFile(buf, 'tileset.png');
        if (!saved) return;
        alert(`Saved PNG:\n${saved}`);
        this.$emit('go-start');
        this.$nextTick(() => this.$emit('refresh-folder'));
      } catch (err) {
        console.error(err);
        alert('Save failed: ' + err.message);
      }
    },

    // load a .json project (settings, perTileSettings & imagePath)
    async loadProjectFile() {
      const json = await window.electronAPI.loadProject();
      if (!json) return;
      let obj;
      try { obj = JSON.parse(json); }
      catch { return alert('Could not parse project'); }

      if (obj.imagePath) {
        this.imagePath = obj.imagePath;
        this.imageUrl  = await window.electronAPI.readFileDataURL(obj.imagePath);
      }
      this.settings        = { ...this.settings, ...obj.settings };
      this.perTileSettings = obj.perTileSettings || {};
      alert('Project loaded.');
    },

    // initial open (image or .json)
    async loadProject(path) {
      if (!path) return;
      if (path.endsWith('.json')) {
        const json = await window.electronAPI.loadProject();
        if (!json) return;
        const obj = JSON.parse(json);
        if (obj.imagePath) {
          this.imagePath = obj.imagePath;
          this.imageUrl  = await window.electronAPI.readFileDataURL(obj.imagePath);
        }
        this.settings        = { ...this.settings, ...obj.settings };
        this.perTileSettings = obj.perTileSettings || {};
      } else {
        this.imagePath = path;
        this.imageUrl  = await window.electronAPI.readFileDataURL(path);
      }
    }
  }
};
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
}
.app-container {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
  padding: 1rem;
}
.sidebar {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}
.back {
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>

