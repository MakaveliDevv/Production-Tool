<template>
  <div class="start-screen">
    <h1 class="title">SnapTile</h1>
    <div class="controls">
      <button @click="openTileset">Import Tileset</button>
      <button @click="openFolder">Import Folder</button>
    </div>

    <div class="grid" :class="{ empty: projects.length === 0 }">
      <div
        v-for="proj in projects"
        :key="proj.path"
        class="tile-cell"
      >
        <img :src="proj.url" class="thumb" />

        <!-- only show ⋮ when menu is closed -->
        <button
          v-if="activeMenu !== proj.path"
          class="menu-btn"
          @click="toggleMenu(proj.path)"
        >⋮</button>

        <!-- overlay & its own close button -->
        <div
          v-if="activeMenu === proj.path"
          class="tile-menu"
        >
          <!-- X button on overlay -->
          <button class="close-btn" @click="toggleMenu(proj.path)">✕</button>

          <button @click="onEdit(proj.path)">Edit</button>
          <button @click="onExport(proj.path)">Export</button>
          <button @click="confirmDelete(proj.path)">Delete</button>

          <div
            v-if="deleteConfirm === proj.path"
            class="delete-prompt"
          >
            <p>Are you sure?</p>
            <button @click="onDelete(proj.path)">Yes</button>
            <button @click="cancelDelete()">No</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "StartScreen",
  props: { folderPath: String },
  data() {
    return {
      projects: [],
      activeMenu: null,
      deleteConfirm: null
    };
  },
  watch: {
    folderPath: {
      immediate: true,
      async handler(folder) {
        if (!folder) return (this.projects = []);
        const files = await window.electronAPI.listDirectory(folder);
        const images = files.filter(f => /\.(png|jpe?g)$/i.test(f));
        this.projects = await Promise.all(
          images.map(async name => {
            const full = `${folder}/${name}`;
            return {
              path: full,
              url: await window.electronAPI.readFileDataURL(full)
            };
          })
        );
      }
    }
  },
  methods: {
    openTileset() {
      window.electronAPI.openFile().then(file => file && this.$emit("file-selected", file));
    },
    openFolder() {
      window.electronAPI.openDirectory().then(dir => dir && this.$emit("folder-selected", dir));
    },

    toggleMenu(path) {
      if (this.activeMenu === path) {
        this.activeMenu = null;
        this.deleteConfirm = null;
      } else {
        this.activeMenu = path;
        this.deleteConfirm = null;
      }
    },
    onEdit(path) {
      this.$emit("open-project", path);
      this.toggleMenu(path);
    },
    onExport(path) {
      this.$emit("open-export", path);
      this.toggleMenu(path);
    },
    confirmDelete(path) {
      this.deleteConfirm = path;
    },
    cancelDelete() {
      this.deleteConfirm = null;
    },
    onDelete(path) {
      this.$emit("delete-project", path);
      this.cancelDelete();
      this.toggleMenu(path);
    }
  }
};
</script>

<style scoped>
.start-screen { padding: 2rem; }
.title { text-align: center; font-size: 2rem; margin-bottom: 1rem; }
.controls { display: flex; justify-content: center; gap: 1rem; margin-bottom: 1.5rem; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 100px);
  gap: 1rem;
  padding: 1rem;
  background: #eee;
  min-height: 300px;
  justify-content: center;
}

.tile-cell {
  position: relative;
  width: 100px; height: 100px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}

.thumb { max-width: 100%; max-height: 100%; object-fit: contain; }

/* ⋮ menu button */
.menu-btn {
  position: absolute;
  top: 4px; right: 4px;
  width: 24px; height: 24px;
  background: rgba(0,0,0,0.6);
  color: white; border: none; border-radius: 12px;
  font-size: 1.2rem; line-height: 1;
  cursor: pointer;
}
.menu-btn:hover { background: rgba(0,0,0,0.8); }

/* overlay */
.tile-menu {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* X close button inside overlay */
.close-btn {
  position: absolute;
  top: 4px; right: 4px;
  width: 24px; height: 24px;
  background: rgba(255,255,255,0.9);
  color: #333; border: none; border-radius: 12px;
  font-size: 1.2rem; line-height: 1;
  cursor: pointer;
}
.close-btn:hover { background: #fff; }

/* menu actions */
.tile-menu button:not(.close-btn) {
  padding: 0.4rem 0.8rem;
  background: #fff;
  border: none; border-radius: 2px;
  cursor: pointer;
}
.tile-menu button:not(.close-btn):hover {
  background: #eee;
}

/* delete confirmation */
.delete-prompt {
  margin-top: 0.5rem;
  background: #fff;
  padding: 0.5rem;
  border-radius: 2px;
  text-align: center;
}
.delete-prompt p { margin: 0 0 0.5rem; }
.delete-prompt button { margin: 0 0.25rem; }
</style>

