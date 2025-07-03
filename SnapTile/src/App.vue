<!-- <template>
  <component
    :is="currentView"
    v-bind="viewProps"
    @file-selected="onFile"
    @folder-selected="onFolder"
    @open-project="openProject"
    @go-start="view = 'start'"  
    @save="saveProject"
    @load="showLoadDialog"
    @go-export="goExport"
    @done-export="goEditor"
  />
</template>

<script>
import StartScreen  from './screens/StartScreen.vue'
import EditorScreen from './screens/EditorScreen.vue'

export default {
  name: 'App',
  components: { StartScreen, EditorScreen },
  data() {
    return {
      view: 'start',
      currentFolder: null,
      currentFile: null,
      settings: null,
      image: null
    }
  },
  computed: {
    currentView() {
      return this.view === 'editor'
        ? EditorScreen
        : StartScreen
    },
    viewProps() {
      return this.view === 'start'
        ? { folderPath: this.currentFolder }
        : { projectFile: this.currentFile }
    }
  },
  methods: {
    onFile(file) {
      this.currentFile = file
      this.view = 'editor'
    },
    onFolder(folder) {
      this.currentFolder = folder
      this.view = 'start'
    },
    openProject(path) {
      this.onFile(path)
    },
    saveProject() {/*…*/},
    showLoadDialog() {/*…*/},
    goExport() {/*…*/},
    goEditor() { this.view = 'editor' }
  }
}
</script> -->

<!-- <template>
  <component
    :is="currentView"
    v-bind="viewProps"
    @file-selected="onFile"
    @folder-selected="onFolder"
    @open-project="openProject"
    @open-export="openExport"
    @delete-project="deleteProject"
    @go-start="view = 'start'"  
    @save="saveProject"
    @load="showLoadDialog"
    @go-export="goExport"
    @done-export="goEditor"
  />
</template>

<script>
import StartScreen  from './screens/StartScreen.vue'
import EditorScreen from './screens/EditorScreen.vue'
import ExportScreen from './screens/ExportScreen.vue'

export default {
  name: 'App',
  components: { StartScreen, EditorScreen, ExportScreen },
  data() {
    return {
      view: 'start',        // 'start' | 'editor' | 'export'
      currentFolder: null,  // passed to StartScreen
      currentFile: null,    // passed to EditorScreen
      settings: null,       // passed to ExportScreen
      image: null           // passed to ExportScreen
    }
  },
  computed: {
    currentView() {
      if (this.view === 'editor') return EditorScreen
      if (this.view === 'export') return ExportScreen
      return StartScreen
    },
    viewProps() {
      if (this.view === 'start') {
        return { folderPath: this.currentFolder }
      }
      if (this.view === 'editor') {
        return { projectFile: this.currentFile }
      }
      if (this.view === 'export') {
        return { settings: this.settings, image: this.image }
      }
      return {}
    }
  },
  methods: {
    // from StartScreen import/file buttons
    onFile(file) {
      this.currentFile = file
      this.view = 'editor'
    },
    onFolder(folder) {
      this.currentFolder = folder
      this.view = 'start'
    },

    // from StartScreen thumbnail menu
    openProject(path) {
      this.currentFile = path
      this.view = 'editor'
    },
    openExport(path) {
      // if you need to load settings/image first, do it here
      // e.g. this.image = await window.electronAPI.readFileDataURL(path)
      this.currentFile = path
      this.view = 'export'
    },
    deleteProject(path) {
      // call into your backend to delete, then refresh the StartScreen grid
      window.electronAPI.deleteFile(path).then(() => {
        const folder = this.currentFolder
        this.currentFolder = null
        this.$nextTick(() => {
          this.currentFolder = folder
        })
      })
    },

    // from EditorScreen toolbar
    saveProject() {
      // …
    },
    showLoadDialog() {
      // …
    },
    goExport() {
      // navigates from editor → export
      // ensure this.settings & this.image are already set by EditorScreen before calling
      this.view = 'export'
    },
    goEditor() {
      this.view = 'editor'
    }
  }
}
</script> -->

<!-- App.vue -->
<!-- <template>
  <component
    :is="currentView"
    v-bind="viewProps"
    @file-selected="onFile"
    @folder-selected="onFolder"
    @open-project="openProject"
    @open-export="openExport"
    @delete-project="deleteProject"
    @go-start="view = 'start'"
    @save="saveProject"
    @load="showLoadDialog"
    @go-export="goExport"
    @done-export="goEditor"
    @go-editor="goEditor"
  />
</template>

<script>
import StartScreen  from './screens/StartScreen.vue'
import EditorScreen from './screens/EditorScreen.vue'
import ExportScreen from './screens/ExportScreen.vue'

export default {
  name: 'App',
  components: { StartScreen, EditorScreen, ExportScreen },
  data() {
    return {
      view: 'start',
      currentFolder: null,
      currentFile:   null,
      settings:      null,
      image:         null,
      origin:       'start' 
    }
  },
  computed: {
    currentView() {
      if (this.view === 'editor') return EditorScreen
      if (this.view === 'export') return ExportScreen
      return StartScreen
    },
    viewProps() {
      if (this.view === 'start') {
        return { folderPath: this.currentFolder }
      }
      if (this.view === 'editor') {
        return { projectFile: this.currentFile }
      }
      // export
      return {
        settings: this.settings,
        image:    this.image,
        origin:   this.origin
      }
    }
  },
  methods: {
    onFile(file) {
      this.currentFile = file
      this.view = 'editor'
    },
    onFolder(folder) {
      this.currentFolder = folder
      this.view = 'start'
    },
    openProject(path) {
      this.currentFile = path
      this.view = 'editor'
    },
    openExport(path) {
      this.origin = 'start'
      this.currentFile = path
      // if you need to preload settings/image from path, do it here
      this.view = 'export'
    },
    deleteProject(path) {
      window.electronAPI.deleteFile(path).then(() => {
        // refresh grid
        const f = this.currentFolder
        this.currentFolder = null
        this.$nextTick(() => (this.currentFolder = f))
      })
    },
    saveProject() { /* … */ },
    showLoadDialog() { /* … */ },
    goExport() {
      this.origin = 'editor'
      this.view = 'export'
    },
    goEditor() {
      this.view = 'editor'
    }
  }
}
</script> -->

<template>
  <component :is="currentView" v-bind="viewProps" @file-selected="onFile" @folder-selected="onFolder"
    @refresh-folder="reloadCurrentFolder" @open-project="openProject" @open-export="openExport" @delete-project="deleteProject" @go-start="view = 'start'"
    @go-export="goExport" @done-export="goEditor" @go-editor="goEditor" @update:project-file="currentFile = $event" />
</template>

<script>
import StartScreen from './screens/StartScreen.vue'
import EditorScreen from './screens/EditorScreen.vue'
import ExportScreen from './screens/ExportScreen.vue'

export default {
  name: 'App',
  components: { StartScreen, EditorScreen, ExportScreen },
  data() {
    return {
      view: 'start',
      currentFolder: null,
      currentFile: null,
      settings: null,
      image: null,
      origin: 'start'
    }
  },
  computed: {
    currentView() {
      if (this.view === 'editor') return EditorScreen
      if (this.view === 'export') return ExportScreen
      return StartScreen
    },
    viewProps() {
      if (this.view === 'start') return { folderPath: this.currentFolder }
      if (this.view === 'editor') return { projectFile: this.currentFile }
      /* export */                  return {
        settings: this.settings,
        image: this.image,
        origin: this.origin
      }
    }
  },
  methods: {
    onFile(file) {
      this.currentFile = file
      this.view = 'editor'
    },
    onFolder(folder) {
      this.currentFolder = folder
      this.view = 'start'
    },
    openProject(path) {
      this.currentFile = path
      this.view = 'editor'
    },
    openExport(path) {
      this.origin = 'start'
      this.currentFile = path
      this.view = 'export'
    },
    deleteProject(path) {
      window.electronAPI.deleteFile?.(path).then(() => {
        const f = this.currentFolder
        this.currentFolder = null
        this.$nextTick(() => (this.currentFolder = f))
      })
    },
    goExport() {
      this.origin = 'editor'
      this.view = 'export'
    },
    goEditor() {
      this.view = 'editor'
    },
    reloadCurrentFolder() {
      const f = this.currentFolder
      this.currentFolder = null
      this.$nextTick(() => this.currentFolder = f)
    }
  }
}
</script>
