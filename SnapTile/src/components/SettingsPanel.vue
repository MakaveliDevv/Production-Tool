<template>
  <aside class="settings-panel">
    <div class="tab-nav">
      <button
        :class="{ active: activeTab === 'global' }"
        @click="activeTab = 'global'"
      >Global</button>
      <button
        :class="{ active: activeTab === 'perTile' }"
        @click="activeTab = 'perTile'"
      >Per-Tile</button>
    </div>

    <div v-if="activeTab === 'global'">
      <details class="section grid" open>
        <summary><span>Grid Settings</span><i class="chevron"></i></summary>
        <div class="content">
          <label>Grid Cell Size</label>
          <input type="number" v-model.number="local.gridSize" class="small-input" /> px
          <label><input type="checkbox" v-model="local.showGrid" /> Show Grid</label>
        </div>
      </details>

      <details class="section config" open>
        <summary><span>Configuration</span><i class="chevron"></i></summary>
        <div class="content">
          <label class="axis-label">W</label>
          <input type="number" v-model.number="local.tileWidth" class="small-input" /> px
          <label class="axis-label">H</label>
          <input type="number" v-model.number="local.tileHeight" class="small-input" /> px
        </div>
      </details>

      <details class="section offset" open>
          <summary><span>Offset & Positioning</span><i class="chevron"></i></summary>
          <div class="content">
            <label>Offset</label>
            <label class="axis-label">X</label>
            <input type="number" v-model.number="local.offsetX" class="small-input" />
            <label class="axis-label">Y</label>
            <input type="number" v-model.number="local.offsetY" class="small-input" />
            <label>Rotation</label>
            <input type="number" v-model.number="local.rotation" class="small-input" />°
            <label>Scale</label>
            <input type="number" step="0.1" v-model.number="local.scale" class="small-input" />
          </div>
        </details>

      <details class="section image" open>
        <summary><span>Image Adjustments</span><i class="chevron"></i></summary>
        <div class="content">
          <label>Brightness: <span class="slider-value">{{ local.brightness }}</span></label>
          <input type="range" min="-100" max="100" v-model.number="local.brightness" class="range-input" />
          <label>Contrast: <span class="slider-value">{{ local.contrast }}</span></label>
          <input type="range" min="-100" max="100" v-model.number="local.contrast" class="range-input" />
          <label>Blur: <span class="slider-value">{{ local.blur }}</span></label>
          <input type="range" min="0" max="50" v-model.number="local.blur" class="range-input" />
        </div>
      </details>

      <details class="section filter" open>
        <summary><span>Filter Effects</span><i class="chevron"></i></summary>
        <div class="content">
          <label><input type="radio" value="none" v-model="local.filterMethod" /> None</label>
          <label><input type="radio" value="sepia" v-model="local.filterMethod" /> Sepia</label>
          <label><input type="radio" value="grayscale" v-model="local.filterMethod" /> Grayscale</label>
          <label><input type="radio" value="invert" v-model="local.filterMethod" /> Invert</label>
          <label>Strength</label>
          <input type="range" min="0" max="100" v-model.number="local.filterStrength" class="range-input" />
        </div>
      </details>

      <details class="section save-options" open>
        <summary><span>Save Options</span><i class="chevron"></i></summary>
        <div class="content">
          <label><input type="radio" name="resolution" value="256" v-model="selectedPreset" @change="applyPreset('256')" /> 256×256</label>
          <label><input type="radio" name="resolution" value="512" v-model="selectedPreset" @change="applyPreset('512')" /> 512×512</label>
          <label><input type="radio" name="resolution" value="1024" v-model="selectedPreset" @change="applyPreset('1024')" /> 1024×1024</label>
          <label><input type="radio" name="resolution" value="custom" v-model="selectedPreset" /> Custom…</label>
          <div v-if="selectedPreset==='custom'" class="custom-inputs">
            <label>W: <input type="number" v-model.number="local.exportWidth" class="small-input" min="1" /></label>
            <label>H: <input type="number" v-model.number="local.exportHeight" class="small-input" min="1" /></label>
          </div>
        </div>
      </details>
    </div>

    <div v-if="activeTab === 'perTile'">
      <div v-if="selectedTiles.length === 0" class="no-selection">No tiles selected.</div>

      <template v-if="selectedTiles.length > 0">
        <details class="section grid" open>
          <summary><span>Grid Settings</span><i class="chevron"></i></summary>
          <div class="content">
            <label>Grid Cell Size</label>
            <input type="number" v-model.number="local.gridSize" class="small-input" /> px
            <label><input type="checkbox" v-model="local.showGrid" /> Show Grid</label>
          </div>
        </details>
        <details class="section config" open>
          <summary><span>Configuration</span><i class="chevron"></i></summary>
          <div class="content">
            <label class="axis-label">W</label>
            <input type="number" :value="mergedSettings.tileWidth" @input="updateSetting('tileWidth',$event.target.value)" :disabled="isDisabled.tileWidth" class="small-input" :placeholder="mergedSettings.tileWidth===null?'–':''" /> px
            <label class="axis-label">H</label>
            <input type="number" :value="mergedSettings.tileHeight" @input="updateSetting('tileHeight',$event.target.value)" :disabled="isDisabled.tileHeight" class="small-input" :placeholder="mergedSettings.tileHeight===null?'–':''" /> px
          </div>
        </details>
        <details class="section offset" open>
          <summary><span>Offset & Positioning</span><i class="chevron"></i></summary>
          <div class="content">
            <label>Offset</label>
            <label class="axis-label">X</label>
            <input type="number" :value="mergedSettings.offsetX" @input="updateSetting('offsetX',$event.target.value)" :disabled="isDisabled.offsetX" class="small-input" />
            <label class="axis-label">Y</label>
            <input type="number" :value="mergedSettings.offsetY" @input="updateSetting('offsetY',$event.target.value)" :disabled="isDisabled.offsetY" class="small-input" />
          </div>
        </details>
        <details class="section image" open>
          <summary><span>Image Adjustments</span><i class="chevron"></i></summary>
          <div class="content">
            <label>Brightness: <span class="slider-value">{{ mergedSettings.brightness }}</span></label>
            <input type="range" min="-100" max="100" :value="mergedSettings.brightness" @input="updateSetting('brightness',$event.target.value)" class="range-input" />
            <label>Contrast: <span class="slider-value">{{ mergedSettings.contrast }}</span></label>
            <input type="range" min="-100" max="100" :value="mergedSettings.contrast" @input="updateSetting('contrast',$event.target.value)" class="range-input" />
            <label>Blur: <span class="slider-value">{{ mergedSettings.blur }}</span></label>
            <input type="range" min="0" max="50" :value="mergedSettings.blur" @input="updateSetting('blur',$event.target.value)" class="range-input" />
          </div>
        </details>
        <details class="section filter" open>
          <summary><span>Filter Effects</span><i class="chevron"></i></summary>
          <div class="content">
            <label><input type="radio" value="none" v-model="local.filterMethod" @change="updateSetting('filterMethod','none')"/> None</label>
            <label><input type="radio" value="sepia" v-model="local.filterMethod" @change="updateSetting('filterMethod','sepia')"/> Sepia</label>
            <label><input type="radio" value="grayscale" v-model="local.filterMethod" @change="updateSetting('filterMethod','grayscale')"/> Grayscale</label>
            <label><input type="radio" value="invert" v-model="local.filterMethod" @change="updateSetting('filterMethod','invert')"/> Invert</label>
            <label>Strength</label>
            <input type="range" min="0" max="100" :value="mergedSettings.filterStrength" @input="updateSetting('filterStrength',$event.target.value)" class="range-input" />
          </div>
        </details>
        <details class="section save-options" open>
          <summary><span>Save Options</span><i class="chevron"></i></summary>
          <div class="content">
            <label><input type="radio" name="resolution-per" value="256" v-model="selectedPreset" @change="applyPreset('256')" /> 256×256</label>
            <label><input type="radio" name="resolution-per" value="512" v-model="selectedPreset" @change="applyPreset('512')" /> 512×512</label>
            <label><input type="radio" name="resolution-per" value="1024" v-model="selectedPreset" @change="applyPreset('1024')" /> 1024×1024</label>
            <label><input type="radio" name="resolution-per" value="custom" v-model="selectedPreset" /> Custom…</label>
            <div v-if="selectedPreset==='custom'" class="custom-inputs">
              <label>W: <input type="number" v-model.number="local.exportWidth" class="small-input" min="1" /></label>
              <label>H: <input type="number" v-model.number="local.exportHeight" class="small-input" min="1" /></label>
            </div>
          </div>
        </details>
      </template>
    </div>
  </aside>
</template>

<script>
import { ref, reactive, watch, computed } from 'vue';

export default {
  name: 'SettingsPanel',
  emits: ['update:settings','update:perTileSettings'],
  props: {
    settings: { type: Object, required: true },
    perTileSettings: { type: Object, default:()=>({}) },
    selectedTiles: { type: Array, default:()=>[] }
  },
  setup(props,{emit}){
    const activeTab = ref('global');
    const local = reactive({
      ...props.settings,
      gridSize: props.settings.gridSize ?? 32,
      selectAll: props.settings.selectAll ?? true,
      exportWidth: props.settings.exportWidth || null,
      exportHeight: props.settings.exportHeight || null
    });
    watch(local,val=>emit('update:settings',{...val}),{deep:true});
    watch(activeTab,tab=>{ local.selectAll=(tab==='global') },{immediate:true});

    const keys = ['tileWidth','tileHeight','offsetX','offsetY','rotation','scale','brightness','contrast','blur','filterMethod','filterStrength'];
    const mergedSettings = computed(()=>{
      const out = {};
      keys.forEach(k=>{
        const vals = props.selectedTiles.map(cell=> props.perTileSettings[cell]?.[k] ?? props.settings[k]);
        out[k] = vals.every(v=>v===vals[0])? vals[0] : null;
      });
      return out;
    });
    const isDisabled = computed(()=>{
      const map={}; if(props.selectedTiles.length<=1) return map;
      keys.forEach(k=>{
        const vals = props.selectedTiles.map(cell=> props.perTileSettings[cell]?.[k] ?? props.settings[k]);
        map[k] = !vals.every(v=>v===vals[0]);
      });
      return map;
    });

    const selectedPreset = ref('custom');
    if(local.exportWidth===256 && local.exportHeight===256) selectedPreset.value='256';
    else if(local.exportWidth===512 && local.exportHeight===512) selectedPreset.value='512';
    else if(local.exportWidth===1024 && local.exportHeight===1024) selectedPreset.value='1024';
    function applyPreset(p){ const s=Number(p); local.exportWidth=s; local.exportHeight=s; selectedPreset.value=p; }
    watch(()=>[props.settings.exportWidth,props.settings.exportHeight],([w,h])=>{
      if(w===256&&h===256) selectedPreset.value='256';
      else if(w===512&&h===512) selectedPreset.value='512';
      else if(w===1024&&h===1024) selectedPreset.value='1024';
      else selectedPreset.value='custom';
    });

    function updateSetting(key, raw){
      const numKeys=['tileWidth','tileHeight','offsetX','offsetY','rotation','scale','brightness','contrast','blur','filterStrength'];
      const val = numKeys.includes(key)? Number(raw) : raw;
      const m = { ...props.perTileSettings };
      props.selectedTiles.forEach(cell=>{ m[cell] = {...m[cell], [key]: val}; });
      local.selectAll = false;
      emit('update:perTileSettings', m);
    }

    return { activeTab, local, selectedPreset, applyPreset, mergedSettings, isDisabled, updateSetting };
  }
};
</script>

<style scoped>
.settings-panel { width: 220px; padding: 0.5rem; overflow-y: auto; }
.tab-nav { display: flex; margin-bottom: 0.5rem; }
.tab-nav button { flex: 1; padding: 0.25rem; border: none; background: #ddd; cursor: pointer; }
.tab-nav button.active { background: #bbb; font-weight: bold; }
.section { margin-bottom: 0.5rem; border-radius: 4px; overflow: hidden; }
.section.grid summary { background: #f85b5b; }
.section.config summary { background: #cce5ff; }
.section.offset summary { background: #ccffdd; }
.section.image summary { background: #ffdddd; }
.section.filter summary { background: #fff5cc; }
.section.save-options summary { background: #ddf; }
summary { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.5rem; cursor: pointer; font-weight: bold; }
.chevron { border: solid #333; border-width: 0 2px 2px 0; padding: 2px; transform: rotate(45deg); transition: transform 0.2s; }
details[open] .chevron { transform: rotate(-135deg); }
.content { background: #fafafa; padding: 0.25rem 0.5rem; }
label { display: flex; align-items: center; margin-top: 0.25rem; font-size: 0.85rem; }
.small-input { width: 3rem; margin: 0 0.25rem; }
.range-input { flex: 1; margin: 0 0.25rem; }
.axis-label { width: 1.2em; text-align: center; margin-right: 0.25rem; }
.slider-value { font-weight: bold; margin-left: 0.25rem; }
.custom-inputs { margin-top: 0.25rem; }
.custom-inputs label { display: block; margin-bottom: 0.25rem; }
.no-selection { font-style: italic; color: #666; margin: 0.5rem 0; }
</style>

<!-- <template>
  <aside class="settings-panel">
    <div class="tab-nav">
      <button
        :class="{ active: activeTab === 'global' }"
        @click="activeTab = 'global'"
      >Global</button>
      <button
        :class="{ active: activeTab === 'perTile' }"
        @click="activeTab = 'perTile'"
      >Per-Tile</button>
    </div>

    <div v-if="activeTab === 'global'">
      <details class="section grid" open>
        <summary><span>Grid Settings</span><i class="chevron"></i></summary>
        <div class="content">
          <label>Grid Cell Size</label>
          <input type="number" v-model.number="local.gridSize" class="small-input" /> px
          <label><input type="checkbox" v-model="local.showGrid" /> Show Grid</label>
        </div>
      </details>

      <details class="section config" open>
        <summary><span>Configuration</span><i class="chevron"></i></summary>
        <div class="content">
          <label class="axis-label">W</label>
          <input type="number" v-model.number="local.tileWidth" class="small-input" /> px
          <label class="axis-label">H</label>
          <input type="number" v-model.number="local.tileHeight" class="small-input" /> px
        </div>
      </details>

      <details class="section offset" open>
        <summary><span>Offset & Positioning</span><i class="chevron"></i></summary>
        <div class="content">
          <label class="axis-label">X</label>
          <input type="number" v-model.number="local.offsetX" class="small-input" />
          <label class="axis-label">Y</label>
          <input type="number" v-model.number="local.offsetY" class="small-input" />
          <label>Rotation</label>
          <input type="number" v-model.number="local.rotation" class="small-input" />°
          <label>Scale</label>
          <input type="number" step="0.1" v-model.number="local.scale" class="small-input" />
        </div>
      </details>

      <details class="section image" open>
        <summary><span>Image Adjustments</span><i class="chevron"></i></summary>
        <div class="content">
          <label>Brightness: <span class="slider-value">{{ local.brightness }}</span></label>
          <input type="range" min="-100" max="100" v-model.number="local.brightness" class="range-input" />
          <label>Contrast: <span class="slider-value">{{ local.contrast }}</span></label>
          <input type="range" min="-100" max="100" v-model.number="local.contrast" class="range-input" />
          <label>Blur: <span class="slider-value">{{ local.blur }}</span></label>
          <input type="range" min="0" max="50" v-model.number="local.blur" class="range-input" />
          <label>Tile Color</label>
          <input type="color" v-model="local.tileColor" />
        </div>
      </details>

      <details class="section filter" open>
        <summary><span>Filter Effects</span><i class="chevron"></i></summary>
        <div class="content">
          <label><input type="radio" value="none" v-model="local.filterMethod" /> None</label>
          <label><input type="radio" value="sepia" v-model="local.filterMethod" /> Sepia</label>
          <label><input type="radio" value="grayscale" v-model="local.filterMethod" /> Grayscale</label>
          <label><input type="radio" value="invert" v-model="local.filterMethod" /> Invert</label>
          <label>Strength</label>
          <input type="range" min="0" max="100" v-model.number="local.filterStrength" class="range-input" />
        </div>
      </details>

      <details class="section save-options" open>
        <summary><span>Save Options</span><i class="chevron"></i></summary>
        <div class="content">
          <label><input type="radio" name="resolution" value="256" v-model="selectedPreset" @change="applyPreset('256')" /> 256×256</label>
          <label><input type="radio" name="resolution" value="512" v-model="selectedPreset" @change="applyPreset('512')" /> 512×512</label>
          <label><input type="radio" name="resolution" value="1024" v-model="selectedPreset" @change="applyPreset('1024')" /> 1024×1024</label>
          <label><input type="radio" name="resolution" value="custom" v-model="selectedPreset" /> Custom…</label>
          <div v-if="selectedPreset==='custom'" class="custom-inputs">
            <label>W: <input type="number" v-model.number="local.exportWidth" class="small-input" min="1" /></label>
            <label>H: <input type="number" v-model.number="local.exportHeight" class="small-input" min="1" /></label>
          </div>
        </div>
      </details>
    </div>

    <div v-if="activeTab === 'perTile'">
      <div v-if="selectedTiles.length === 0" class="no-selection">
        No tiles selected.
      </div>
      <template v-else>
        <details class="section grid" open>
          <summary><span>Grid Settings</span><i class="chevron"></i></summary>
          <div class="content">
            <label>Grid Cell Size</label>
            <input type="number" v-model.number="local.gridSize" class="small-input" /> px
            <label><input type="checkbox" v-model="local.showGrid" /> Show Grid</label>
          </div>
        </details>
        <details class="section config" open>
          <summary><span>Configuration</span><i class="chevron"></i></summary>
          <div class="content">
            <label class="axis-label">W</label>
            <input type="number" :value="mergedSettings.tileWidth" @input="updateSetting('tileWidth', $event.target.value)" :disabled="isDisabled.tileWidth" class="small-input" :placeholder="mergedSettings.tileWidth===null?'–':''" /> px
            <label class="axis-label">H</label>
            <input type="number" :value="mergedSettings.tileHeight" @input="updateSetting('tileHeight', $event.target.value)" :disabled="isDisabled.tileHeight" class="small-input" :placeholder="mergedSettings.tileHeight===null?'–':''" /> px
          </div>
        </details>
        <details class="section offset" open>
          <summary><span>Offset & Positioning</span><i class="chevron"></i></summary>
          <div class="content">
            <label class="axis-label">X</label>
            <input type="number" :value="mergedSettings.offsetX" @input="updateSetting('offsetX', $event.target.value)" :disabled="isDisabled.offsetX" class="small-input" />
            <label class="axis-label">Y</label>
            <input type="number" :value="mergedSettings.offsetY" @input="updateSetting('offsetY', $event.target.value)" :disabled="isDisabled.offsetY" class="small-input" />
            <label>Rotation</label>
            <input type="number" :value="mergedSettings.rotation" @input="updateSetting('rotation', $event.target.value)" :disabled="isDisabled.rotation" class="small-input" />°
            <label>Scale</label>
            <input type="number" step="0.1" :value="mergedSettings.scale" @input="updateSetting('scale', $event.target.value)" :disabled="isDisabled.scale" class="small-input" />
          </div>
        </details>
        <details class="section image" open>
          <summary><span>Image Adjustments</span><i class="chevron"></i></summary>
          <div class="content">
            <label>Brightness: <span class="slider-value">{{ mergedSettings.brightness }}</span></label>
            <input type="range" min="-100" max="100" :value="mergedSettings.brightness" @input="updateSetting('brightness', $event.target.value)" class="range-input" />
            <label>Contrast: <span class="slider-value">{{ mergedSettings.contrast }}</span></label>
            <input type="range" min="-100" max="100" :value="mergedSettings.contrast" @input="updateSetting('contrast', $event.target.value)" class="range-input" />
            <label>Blur: <span class="slider-value">{{ mergedSettings.blur }}</span></label>
            <input type="range" min="0" max="50" :value="mergedSettings.blur" @input="updateSetting('blur', $event.target.value)" class="range-input" />
            <label>Tile Color</label>
            <input type="color" :value="mergedSettings.tileColor||local.tileColor" @input="updateSetting('tileColor', $event.target.value)" />
          </div>
        </details>
        <details class="section filter" open>
          \<div class="content">
            <label><input type="radio" value="none" v-model="local.filterMethod" @change="updateSetting('filterMethod','none')"/> None</label>
            <label><input type="radio" value="sepia" v-model="local.filterMethod" @change="updateSetting('filterMethod','sepia')"/> Sepia</label>
            <label><input type="radio" value="grayscale" v-model="local.filterMethod" @change="updateSetting('filterMethod','grayscale')"/> Grayscale</label>
            <label><input type="radio" value="invert" v-model="local.filterMethod" @change="updateSetting('filterMethod','invert')"/> Invert</label>
            <label>Strength</label>
            <input type="range" min="0" max="100" :value="mergedSettings.filterStrength" @input="updateSetting('filterStrength', $event.target.value)" class="range-input" />
          </div>
        </details>
        <details class="section save-options" open>
          <summary><span>Save Options</span><i class="chevron"></i></summary>
          <div class="content">
            <label><input type="radio" name="resolution-per" value="256" v-model="selectedPreset" @change="applyPreset('256')" /> 256×256</label>
            <label><input type="radio" name="resolution-per" value="512" v-model="selectedPreset" @change="applyPreset('512')" /> 512×512</label>
            <label><input type="radio" name="resolution-per" value="1024" v-model="selectedPreset" @change="applyPreset('1024')" /> 1024×1024</label>
            <label><input type="radio" name="resolution-per" value="custom" v-model="selectedPreset" /> Custom…</label>
            <div v-if="selectedPreset==='custom'" class="custom-inputs">
              <label>W: <input type="number" v-model.number="local.exportWidth" class="small-input" min="1" /></label>
              <label>H: <input type="number" v-model.number="local.exportHeight" class="small-input" min="1" /></label>
            </div>
          </div>
        </details>
      </template>
    </div>
  </aside>
</template>

<script>
import { ref, reactive, watch, computed } from 'vue';

export default {
  name: 'SettingsPanel',
  emits: ['update:settings','update:perTileSettings'],
  props: {
    settings: { type: Object, required: true },
    perTileSettings: { type: Object, default:()=>({}) },
    selectedTiles: { type: Array, default:()=>[] }
  },
  setup(props,{emit}){
    const activeTab = ref('global');
    const local = reactive({
      ...props.settings,
      gridSize: props.settings.gridSize ?? 32,
      selectAll: props.settings.selectAll ?? true,
      exportWidth: props.settings.exportWidth || null,
      exportHeight: props.settings.exportHeight || null,
      tileColor: props.settings.tileColor || '#ffffff'
    });
    watch(local,val=>emit('update:settings',{...val}),{deep:true});
    watch(activeTab,tab=>{ local.selectAll=(tab==='global') },{immediate:true});

    const keys = ['tileWidth','tileHeight','offsetX','offsetY','rotation','scale','brightness','contrast','blur','filterMethod','filterStrength','tileColor'];
    const mergedSettings = computed(()=>{
      const out = {};
      keys.forEach(k=>{
        const vals = props.selectedTiles.map(cell=> props.perTileSettings[cell]?.[k] ?? props.settings[k]);
        out[k] = vals.every(v=>v===vals[0])? vals[0] : null;
      });
      return out;
    });
    const isDisabled = computed(()=>{
      const map={}; if(props.selectedTiles.length<=1) return map;
      keys.forEach(k=>{
        const vals = props.selectedTiles.map(cell=> props.perTileSettings[cell]?.[k] ?? props.settings[k]);
        map[k] = !vals.every(v=>v===vals[0]);
      });
      return map;
    });

    const selectedPreset = ref('custom');
    if(local.exportWidth===256 && local.exportHeight===256) selectedPreset.value='256';
    else if(local.exportWidth===512 && local.exportHeight===512) selectedPreset.value='512';
    else if(local.exportWidth===1024 && local.exportHeight===1024) selectedPreset.value='1024';
    function applyPreset(p){ const s=Number(p); local.exportWidth=s; local.exportHeight=s; selectedPreset.value=p; }
    watch(()=>[props.settings.exportWidth,props.settings.exportHeight],([w,h])=>{
      if(w===256&&h===256) selectedPreset.value='256';
      else if(w===512&&h===512) selectedPreset.value='512';
      else if(w===1024&&h===1024) selectedPreset.value='1024';
      else selectedPreset.value='custom';
    });

    function updateSetting(key, raw){
      const numKeys=['tileWidth','tileHeight','offsetX','offsetY','rotation','scale','brightness','contrast','blur','filterStrength','tileColor'];
      const val = numKeys.includes(key)? Number(raw) : raw;
      const m = { ...props.perTileSettings };
      props.selectedTiles.forEach(cell=>{ m[cell] = {...m[cell], [key]: val}; });
      local.selectAll = false;
      emit('update:perTileSettings', m);
    }

    return { activeTab, local, selectedPreset, applyPreset, mergedSettings, isDisabled, updateSetting };
  }
};
</script>

<style scoped>
.settings-panel { width: 220px; padding: 0.5rem; overflow-y: auto; }
.tab-nav { display: flex; margin-bottom: 0.5rem; }
.tab-nav button { flex: 1; padding: 0.25rem; border: none; background: #ddd; cursor: pointer; }
.tab-nav button.active { background: #bbb; font-weight: bold; }
.section { margin-bottom: 0.5rem; border-radius: 4px; overflow: hidden; }
.section.grid summary { background: #f85b5b; }
.section.config summary { background: #cce5ff; }
.section.offset summary { background: #ccffdd; }
.section.image summary { background: #ffdddd; }
.section.filter summary { background: #fff5cc; }
.section.save-options summary { background: #ddf; }
summary { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.5rem; cursor: pointer; font-weight: bold; }
.chevron { border: solid #333; border-width: 0 2px 2px 0; padding: 2px; transform: rotate(45deg); transition: transform 0.2s; }
details[open] .chevron { transform: rotate(-135deg); }
.content { background: #fafafa; padding: 0.25rem 0.5rem; }
label { display: flex; align-items: center; margin-top: 0.25rem; font-size: 0.85rem; }
.small-input { width: 3rem; margin: 0 0.25rem; }
.range-input { flex: 1; margin: 0 0.25rem; }
.axis-label { width: 1.2em; text-align: center; margin-right: 0.25rem; }
.slider-value { font-weight: bold; margin-left: 0.25rem; }
.custom-inputs { margin-top: 0.25rem; }
.custom-inputs label { display: block; margin-bottom: 0.25rem; }
.no-selection { font-style: italic; color: #666; margin: 0.5rem 0; }
</style> -->
