<template>
  <div
    class="preview-container"
    @wheel.prevent="onWheel"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @mousemove="onDrag"
    @contextmenu.prevent
    ref="previewContainer"
  >
    <canvas ref="previewCanvas"></canvas>
  </div>
</template>

<script>
import { onMounted, watch, ref, reactive, nextTick } from 'vue';

export default {
  name: 'TexturePreview',
  emits: ['update:settings', 'update:selectedTiles'],
  props: {
    settings:        { type: Object, required: true },
    imageUrl:        { type: String, default: '' },
    selectedTiles:   { type: Array, default: () => [] },
    perTileSettings: { type: Object, default: () => ({}) }
  },
  setup(props, { emit }) {
    const previewCanvas    = ref(null);
    const previewContainer = ref(null);
    const img = new Image();
    let sliceW = props.settings.tileWidth;
    let sliceH = props.settings.tileHeight;

    const state = reactive({
      panX: 0, panY: 0, zoom: 1,
      isPanning: false,
      isRectSelecting: false,
      rectStart: { gx: 0, gy: 0 },
      rectCurrent: { gx: 0, gy: 0 },
      selectedCells: [...props.selectedTiles],
      clickCount: 0, lastClickTime: 0,
      startX: 0, startY: 0,
      selectionMode: 'toggle'
    });

    // REDRAW TRIGGERS
    watch(() => props.settings, draw, { deep: true });
    watch(() => props.perTileSettings, draw, { deep: true });
    watch(() => props.selectedTiles, sel => {
      state.selectedCells = [...sel];
      draw();
    });
    watch(() => props.settings.selectAll, sel => {
      state.selectedCells = sel ? computeAllKeys() : [];
      state.selectionMode = 'toggle';
      emit('update:selectedTiles', [...state.selectedCells]);
      draw();
    });

    function cellSize() { return props.settings.gridSize; }
    function computeAllKeys() {
      const size = cellSize();
      if (!img.width || !img.height) return [];
      const cols = Math.ceil(img.width / size);
      const rows = Math.ceil(img.height / size);
      const out = [];
      for (let x = 0; x < cols; x++)
        for (let y = 0; y < rows; y++)
          out.push(`${x},${y}`);
      return out;
    }

    function draw() {
      if (!img.complete) return;
      const canvas    = previewCanvas.value;
      const container = previewContainer.value;
      const ctx       = canvas.getContext('2d');
      const cw = container.clientWidth, ch = container.clientHeight;
      canvas.width = cw; canvas.height = ch;
      ctx.clearRect(0,0,cw,ch);

      ctx.save();
      ctx.translate(state.panX, state.panY);
      ctx.scale(state.zoom, state.zoom);

      const size = cellSize(), imgW = img.width, imgH = img.height;
      const def  = props.settings;

      // determine visible tile-range
      const left   = -state.panX/state.zoom;
      const top    = -state.panY/state.zoom;
      const right  = (cw-state.panX)/state.zoom;
      const bottom = (ch-state.panY)/state.zoom;
      const startX = Math.floor(left/size),  endX = Math.floor(right/size);
      const startY = Math.floor(top/size),   endY = Math.floor(bottom/size);

      // draw tiles
      for (let gx = startX; gx <= endX; gx++){
        for (let gy = startY; gy <= endY; gy++){
          const cellX = gx*size, cellY = gy*size;
          if (cellX+size<0||cellY+size<0||cellX>=imgW||cellY>=imgH) continue;
          const key = `${gx},${gy}`;
          const base = { ...def };
          const over = props.perTileSettings[key] || {};
          const cfg  = { ...base, ...over };

          ctx.save();
          ctx.filter =
            `brightness(${100+cfg.brightness}%) contrast(${100+cfg.contrast}%) blur(${cfg.blur}px)` +
            (cfg.filterMethod==='sepia'?` sepia(${cfg.filterStrength}%)`:'') +
            (cfg.filterMethod==='grayscale'?` grayscale(${cfg.filterStrength}%)`:'') +
            (cfg.filterMethod==='invert'?` invert(${cfg.filterStrength}%)`:'');
          ctx.translate(cellX+size/2+cfg.offsetX, cellY+size/2+cfg.offsetY);
          ctx.rotate(cfg.rotation*Math.PI/180);
          ctx.scale(cfg.scale, cfg.scale);
          ctx.drawImage(
            img,
            cellX, cellY, sliceW, sliceH,
            -cfg.tileWidth/2, -cfg.tileHeight/2,
            cfg.tileWidth, cfg.tileHeight
          );
          ctx.restore();
        }
      }

      // grid overlay
      if (def.showGrid) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1/state.zoom;
        for (let x = startX; x <= endX+1; x++){
          ctx.moveTo(x*size, startY*size);
          ctx.lineTo(x*size,(endY+1)*size);
        }
        for (let y = startY; y <= endY+1; y++){
          ctx.moveTo(startX*size,y*size);
          ctx.lineTo((endX+1)*size,y*size);
        }
        ctx.stroke(); ctx.restore();
      }

      // selection — only when NOT in “global” (selectAll) mode
      if (!props.settings.selectAll && state.selectedCells.length) {
        const coords = state.selectedCells.map(k=>{
          const [gx,gy] = k.split(',').map(Number);
          return { gx, gy };
        });
        const xs = coords.map(c=>c.gx), ys = coords.map(c=>c.gy);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);

        // thin per-cell + thick outer
        coords.forEach(({gx,gy})=>{
          ctx.save();
          ctx.strokeStyle='red';
          ctx.lineWidth=1/state.zoom;
          ctx.strokeRect(gx*size,gy*size,size,size);
          ctx.restore();
        });
        ctx.save();
        ctx.strokeStyle='red';
        ctx.lineWidth=3/state.zoom;
        ctx.strokeRect(minX*size,minY*size,(maxX-minX+1)*size,(maxY-minY+1)*size);
        ctx.restore();
      }

      ctx.restore();
    }

    onMounted(()=>
      nextTick(()=>{
        state.panX = previewContainer.value.clientWidth/2;
        state.panY = previewContainer.value.clientHeight/2;
        draw();
      })
    );

    watch(
      ()=>props.imageUrl,
      url => {
        if (!url) return;
        img.src = url;
        img.onload = () => {
          sliceW = props.settings.tileWidth;
          sliceH = props.settings.tileHeight;
          draw();
        };
      },
      { immediate: true }
    );

    // INTERACTION HANDLERS...
    function onWheel(e) {
      const r = previewCanvas.value.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const wx = (mx - state.panX) / state.zoom, wy = (my - state.panY) / state.zoom;
      const delta = e.deltaY < 0 ? 1.1 : 0.9;
      state.zoom *= delta;
      state.panX = mx - wx * state.zoom;
      state.panY = my - wy * state.zoom;
      draw();
    }

    function onMouseDown(e) {
      if (props.settings.selectAll && e.button === 0) return;
      if (e.button === 0) {
        const now = Date.now();
        state.clickCount = now - state.lastClickTime < 400 ? state.clickCount + 1 : 1;
        state.lastClickTime = now;
        if (state.clickCount === 2) {
          state.selectedCells = [];
          emit('update:settings', { ...props.settings, selectAll: false });
          emit('update:selectedTiles', []);
          draw();
          return;
        }
      }

      const rect = previewCanvas.value.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const wx = (mx - state.panX) / state.zoom, wy = (my - state.panY) / state.zoom;
      const gx = Math.floor(wx / cellSize()), gy = Math.floor(wy / cellSize());
      const key = `${gx},${gy}`;

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // 1) Ctrl+Shift → start marquee
      if (e.button === 0 && isCtrl && isShift) {
        state.isRectSelecting = true;
        state.rectStart = { gx, gy };
        state.rectCurrent = { gx, gy };
        state.selectionMode = 'marquee';
        return;
      }

      // 2) Ctrl alone → toggle cell
      if (e.button === 0 && isCtrl && !isShift) {
        state.isRectSelecting = false;
        state.selectionMode = 'toggle';
        const idx = state.selectedCells.indexOf(key);
        if (idx >= 0) state.selectedCells.splice(idx, 1);
        else state.selectedCells.push(key);
        emit('update:settings', { ...props.settings, selectAll: false });
        emit('update:selectedTiles', [...state.selectedCells]);
        draw();
        return;
      }

      // 3) Plain click → single-select
      if (e.button === 0 && !isCtrl && !isShift) {
        state.isRectSelecting = false;
        state.selectionMode = 'toggle';
        state.selectedCells = [key];
        emit('update:settings', { ...props.settings, selectAll: false });
        emit('update:selectedTiles', [...state.selectedCells]);
        draw();
        return;
      }

      // 4) Right-button → pan
      if (e.button === 2) {
        state.isPanning = true;
        state.startX = e.clientX - state.panX;
        state.startY = e.clientY - state.panY;
      }
    }

    function onDrag(e) {
      if (state.isPanning) {
        state.panX = e.clientX - state.startX;
        state.panY = e.clientY - state.startY;
        draw();
      }
      if (state.isRectSelecting) {
        const rect = previewCanvas.value.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const wx = (mx - state.panX) / state.zoom, wy = (my - state.panY) / state.zoom;
        state.rectCurrent = {
          gx: Math.floor(wx / cellSize()),
          gy: Math.floor(wy / cellSize())
        };
        draw();
      }
    }

    function onMouseUp() {
      if (state.isRectSelecting) {
        const rs = state.rectStart, rc = state.rectCurrent;
        const minX = Math.min(rs.gx, rc.gx),
          maxX = Math.max(rs.gx, rc.gx),
          minY = Math.min(rs.gy, rc.gy),
          maxY = Math.max(rs.gy, rc.gy);

        state.selectedCells = [];

        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            state.selectedCells.push(`${x},${y}`);
          }
        }
        state.isRectSelecting = false;
        emit('update:settings', { ...props.settings, selectAll: false });
        emit('update:selectedTiles', [...state.selectedCells]);
        draw();
      }
      
      if (state.isPanning) {
        state.isPanning = false;
      }
    }

    // offscreen export helper...
    async function exportBlob() { /* unchanged */ }

    return {
      previewCanvas,
      previewContainer,
      onWheel,
      onMouseDown,
      onDrag,
      onMouseUp,
      exportBlob
    };
  }
};
</script>

<style scoped>
.preview-container {
  width: 100%; height: 100%;
  position: relative; overflow: hidden;
  user-select: none;
}
canvas {
  display: block;
  position: absolute;
  top: 0; left: 0;
}
</style> -->

<!-- <template>
  <div
    class="preview-container"
    @wheel.prevent="onWheel"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @mousemove="onDrag"
    @contextmenu.prevent
    ref="previewContainer"
  >
    <canvas ref="previewCanvas"></canvas>
  </div>
</template>

<script>
import { onMounted, watch, ref, reactive, nextTick } from 'vue';

export default {
  name: 'TexturePreview',
  emits: ['update:settings', 'update:selectedTiles'],
  props: {
    settings:        { type: Object, required: true },
    imageUrl:        { type: String, default: '' },
    selectedTiles:   { type: Array, default: () => [] },
    perTileSettings: { type: Object, default: () => ({}) }
  },
  setup(props, { emit }) {
    const previewCanvas    = ref(null);
    const previewContainer = ref(null);
    const img = new Image();
    let sliceW = props.settings.tileWidth;
    let sliceH = props.settings.tileHeight;

    let rafId = null;
    function scheduleDraw() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        draw();
        rafId = null;
      });
    }

    const state = reactive({
      panX: 0, panY: 0, zoom: 1,
      isPanning: false,
      isRectSelecting: false,
      rectStart: { gx: 0, gy: 0 },
      rectCurrent: { gx: 0, gy: 0 },
      selectedCells: [...props.selectedTiles],
      clickCount: 0, lastClickTime: 0,
      startX: 0, startY: 0,
      selectionMode: 'toggle'
    });

    // REDRAW TRIGGERS
    watch(() => props.settings, scheduleDraw, { deep: true });
    watch(() => props.perTileSettings, scheduleDraw, { deep: true });
    watch(() => props.selectedTiles, sel => { state.selectedCells = [...sel]; scheduleDraw(); });
    watch(() => props.settings.selectAll, sel => {
      state.selectedCells = sel ? computeAllKeys() : [];
      state.selectionMode = 'toggle';
      emit('update:selectedTiles', [...state.selectedCells]);
      scheduleDraw();
    });

    function cellSize() { return props.settings.gridSize; }
    function computeAllKeys() {
      const size = cellSize();
      if (!img.width || !img.height) return [];
      const cols = Math.ceil(img.width / size);
      const rows = Math.ceil(img.height / size);
      const out = [];
      for (let x = 0; x < cols; x++)
        for (let y = 0; y < rows; y++)
          out.push(`${x},${y}`);
      return out;
    }

    function draw() {
      if (!img.complete) return;
      const canvas    = previewCanvas.value;
      const container = previewContainer.value;
      const ctx       = canvas.getContext('2d');
      const cw = container.clientWidth, ch = container.clientHeight;
      canvas.width = cw; canvas.height = ch;
      ctx.clearRect(0,0,cw,ch);

      ctx.save();
      ctx.translate(state.panX, state.panY);
      ctx.scale(state.zoom, state.zoom);

      const size = cellSize(), imgW = img.width, imgH = img.height;
      const def  = props.settings;

      // determine visible range
      const left   = -state.panX/state.zoom;
      const top    = -state.panY/state.zoom;
      const right  = (cw-state.panX)/state.zoom;
      const bottom = (ch-state.panY)/state.zoom;
      const startX = Math.floor(left/size),  endX = Math.floor(right/size);
      const startY = Math.floor(top/size),   endY = Math.floor(bottom/size);

      // draw tiles
      for (let gx = startX; gx <= endX; gx++){
        for (let gy = startY; gy <= endY; gy++){
          const cellX = gx*size, cellY = gy*size;
          if (cellX+size<0||cellY+size<0||cellX>=imgW||cellY>=imgH) continue;
          const key = `${gx},${gy}`;
          const base = { ...def };
          const over = props.perTileSettings[key] || {};
          const cfg  = { ...base, ...over };

          ctx.save();
          ctx.filter =
            `brightness(${100+cfg.brightness}%) contrast(${100+cfg.contrast}%) blur(${cfg.blur}px)` +
            (cfg.filterMethod==='sepia'?` sepia(${cfg.filterStrength}%)`:'') +
            (cfg.filterMethod==='grayscale'?` grayscale(${cfg.filterStrength}%)`:'') +
            (cfg.filterMethod==='invert'?` invert(${cfg.filterStrength}%)`:``);
          ctx.translate(cellX+size/2+cfg.offsetX, cellY+size/2+cfg.offsetY);
          ctx.rotate(cfg.rotation*Math.PI/180);
          ctx.scale(cfg.scale, cfg.scale);
          ctx.drawImage(
            img,
            cellX, cellY, sliceW, sliceH,
            -cfg.tileWidth/2, -cfg.tileHeight/2,
            cfg.tileWidth, cfg.tileHeight
          );

          // apply tileColor tint
          if (cfg.tileColor) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = cfg.tileColor;
            ctx.fillRect(-cfg.tileWidth/2, -cfg.tileHeight/2, cfg.tileWidth, cfg.tileHeight);
            ctx.globalCompositeOperation = 'source-over';
          }
          ctx.restore();
        }
      }

      // grid
      if (def.showGrid) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1/state.zoom;
        for (let x = startX; x <= endX+1; x++){
          ctx.moveTo(x*size, startY*size);
          ctx.lineTo(x*size,(endY+1)*size);
        }
        for (let y = startY; y <= endY+1; y++){
          ctx.moveTo(startX*size,y*size);
          ctx.lineTo((endX+1)*size,y*size);
        }
        ctx.stroke(); ctx.restore();
      }

      // selection only in per-tile mode
      if (!props.settings.selectAll && state.selectedCells.length) {
        const coords = state.selectedCells.map(k=>{
          const [gx,gy] = k.split(',').map(Number);
          return { gx, gy };
        });
        const xs = coords.map(c=>c.gx), ys = coords.map(c=>c.gy);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);

        coords.forEach(({gx,gy})=>{
          ctx.save();
          ctx.strokeStyle='red';
          ctx.lineWidth=1/state.zoom;
          ctx.strokeRect(gx*size,gy*size,size,size);
          ctx.restore();
        });
        ctx.save();
        ctx.strokeStyle='red';
        ctx.lineWidth=3/state.zoom;
        ctx.strokeRect(minX*size,minY*size,(maxX-minX+1)*size,(maxY-minY+1)*size);
        ctx.restore();
      }

      ctx.restore();
    }

    onMounted(()=>
      nextTick(()=>{
        state.panX = previewContainer.value.clientWidth/2;
        state.panY = previewContainer.value.clientHeight/2;
        scheduleDraw();
      })
    );

    watch(
      ()=>props.imageUrl,
      url => {
        if (!url) return;
        img.src = url;
        img.onload = () => {
          sliceW = props.settings.tileWidth;
          sliceH = props.settings.tileHeight;
          scheduleDraw();
        };
      },
      { immediate: true }
    );

    // interaction handlers (unchanged)...
 function onWheel(e) {
      const r = previewCanvas.value.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const wx = (mx - state.panX) / state.zoom, wy = (my - state.panY) / state.zoom;
      const delta = e.deltaY < 0 ? 1.1 : 0.9;
      state.zoom *= delta;
      state.panX = mx - wx * state.zoom;
      state.panY = my - wy * state.zoom;
      draw();
    }

    function onMouseDown(e) {
      if (props.settings.selectAll && e.button === 0) return;
      if (e.button === 0) {
        const now = Date.now();
        state.clickCount = now - state.lastClickTime < 400 ? state.clickCount + 1 : 1;
        state.lastClickTime = now;
        if (state.clickCount === 2) {
          state.selectedCells = [];
          emit('update:settings', { ...props.settings, selectAll: false });
          emit('update:selectedTiles', []);
          draw();
          return;
        }
      }

      const rect = previewCanvas.value.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const wx = (mx - state.panX) / state.zoom, wy = (my - state.panY) / state.zoom;
      const gx = Math.floor(wx / cellSize()), gy = Math.floor(wy / cellSize());
      const key = `${gx},${gy}`;

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // 1) Ctrl+Shift → start marquee
      if (e.button === 0 && isCtrl && isShift) {
        state.isRectSelecting = true;
        state.rectStart = { gx, gy };
        state.rectCurrent = { gx, gy };
        state.selectionMode = 'marquee';
        return;
      }

      // 2) Ctrl alone → toggle cell
      if (e.button === 0 && isCtrl && !isShift) {
        state.isRectSelecting = false;
        state.selectionMode = 'toggle';
        const idx = state.selectedCells.indexOf(key);
        if (idx >= 0) state.selectedCells.splice(idx, 1);
        else state.selectedCells.push(key);
        emit('update:settings', { ...props.settings, selectAll: false });
        emit('update:selectedTiles', [...state.selectedCells]);
        draw();
        return;
      }

      // 3) Plain click → single-select
      if (e.button === 0 && !isCtrl && !isShift) {
        state.isRectSelecting = false;
        state.selectionMode = 'toggle';
        state.selectedCells = [key];
        emit('update:settings', { ...props.settings, selectAll: false });
        emit('update:selectedTiles', [...state.selectedCells]);
        draw();
        return;
      }

      // 4) Right-button → pan
      if (e.button === 2) {
        state.isPanning = true;
        state.startX = e.clientX - state.panX;
        state.startY = e.clientY - state.panY;
      }
    }

    function onDrag(e) {
      if (state.isPanning) {
        state.panX = e.clientX - state.startX;
        state.panY = e.clientY - state.startY;
        draw();
      }
      if (state.isRectSelecting) {
        const rect = previewCanvas.value.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const wx = (mx - state.panX) / state.zoom, wy = (my - state.panY) / state.zoom;
        state.rectCurrent = {
          gx: Math.floor(wx / cellSize()),
          gy: Math.floor(wy / cellSize())
        };
        draw();
      }
    }

    function onMouseUp() {
      if (state.isRectSelecting) {
        const rs = state.rectStart, rc = state.rectCurrent;
        const minX = Math.min(rs.gx, rc.gx),
          maxX = Math.max(rs.gx, rc.gx),
          minY = Math.min(rs.gy, rc.gy),
          maxY = Math.max(rs.gy, rc.gy);

        state.selectedCells = [];

        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            state.selectedCells.push(`${x},${y}`);
          }
        }
        state.isRectSelecting = false;
        emit('update:settings', { ...props.settings, selectAll: false });
        emit('update:selectedTiles', [...state.selectedCells]);
        draw();
      }
      
      if (state.isPanning) {
        state.isPanning = false;
      }
    }

    return {
      previewCanvas,
      previewContainer,
      onWheel,
      onMouseDown,
      onDrag,
      onMouseUp,
      exportBlob
    };
  }
};
</script>

<style scoped>
.preview-container {
  width: 100%; height: 100%;
  position: relative; overflow: hidden;
  user-select: none;
}
canvas {
  display: block;
  position: absolute;
  top: 0; left: 0;
}
</style>











<!-- <template>
  <div
    class="preview-container"
    @wheel.prevent="onWheel"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @mousemove="onDrag"
    @contextmenu.prevent
    ref="previewContainer"
  >
    <canvas ref="previewCanvas"></canvas>
  </div>
</template>

<script>
import { onMounted, watch, ref, reactive, nextTick } from 'vue';

export default {
  name: 'TexturePreview',
  emits: ['update:settings', 'update:selectedTiles'],
  props: {
    settings:        { type: Object, required: true },
    imageUrl:        { type: String, default: '' },
    selectedTiles:   { type: Array, default: () => [] },
    perTileSettings: { type: Object, default: () => ({}) }
  },
  setup(props, { emit }) {
    const previewCanvas    = ref(null);
    const previewContainer = ref(null);
    const img = new Image();
    let sliceW = props.settings.tileWidth;
    let sliceH = props.settings.tileHeight;

    // NEW: Export function declared first so it's in scope everywhere
    async function exportBlob() {
      if (!props.imageUrl) throw new Error("Nothing to export");
      // load fresh image
      const exportImg = new Image();
      exportImg.src = props.imageUrl;
      await new Promise(res => (exportImg.onload = res));

      const cs   = props.settings.gridSize;
      const cols = Math.ceil(exportImg.width  / cs);
      const rows = Math.ceil(exportImg.height / cs);
      const nativeW = cols * props.settings.tileWidth;
      const nativeH = rows * props.settings.tileHeight;
      const expW    = props.settings.exportWidth;
      const expH    = props.settings.exportHeight;

      // draw to offscreen canvas
      const nCanvas = document.createElement('canvas');
      nCanvas.width  = nativeW;
      nCanvas.height = nativeH;
      const nCtx = nCanvas.getContext('2d');

      for (let gx=0; gx<cols; gx++){
        for (let gy=0; gy<rows; gy++){
          const key  = `${gx},${gy}`;
          const base = { ...props.settings };
          const over = props.perTileSettings[key] || {};
          const cfg  = { ...base, ...over };

          // apply filters
          const filters = [
            `brightness(${100+cfg.brightness}%)`,
            `contrast(${100+cfg.contrast}%)`,
            `blur(${cfg.blur}px)`,
            cfg.filterMethod==='sepia'     ? `sepia(${cfg.filterStrength}%)`     : '',
            cfg.filterMethod==='grayscale' ? `grayscale(${cfg.filterStrength}%)`: '',
            cfg.filterMethod==='invert'    ? `invert(${cfg.filterStrength}%)`    : ''
          ].filter(Boolean).join(' ');
          nCtx.filter = filters;

          const sx = gx*cs, sy = gy*cs;
          const dx = gx*cfg.tileWidth, dy = gy*cfg.tileHeight;

          nCtx.save();
          nCtx.translate(dx+cfg.tileWidth/2+cfg.offsetX,
                         dy+cfg.tileHeight/2+cfg.offsetY);
          nCtx.rotate((cfg.rotation*Math.PI)/180);
          nCtx.scale(cfg.scale, cfg.scale);
          nCtx.drawImage(
            exportImg,
            sx, sy, cfg.tileWidth, cfg.tileHeight,
            -cfg.tileWidth/2, -cfg.tileHeight/2,
            cfg.tileWidth, cfg.tileHeight
          );
          // tint overlay
          if (cfg.tileColor) {
            nCtx.globalCompositeOperation = 'multiply';
            nCtx.fillStyle = cfg.tileColor;
            nCtx.fillRect(-cfg.tileWidth/2, -cfg.tileHeight/2, cfg.tileWidth, cfg.tileHeight);
            nCtx.globalCompositeOperation = 'source-over';
          }
          nCtx.restore();
        }
      }

      // scale to desired export
      if (expW && expH) {
        const fCanvas = document.createElement('canvas');
        fCanvas.width  = expW;
        fCanvas.height = expH;
        const fCtx = fCanvas.getContext('2d');
        fCtx.drawImage(nCanvas, 0, 0, nativeW, nativeH, 0, 0, expW, expH);
        return await new Promise(res => fCanvas.toBlob(res, 'image/png'));
      }
      return await new Promise(res => nCanvas.toBlob(res, 'image/png'));
    }

    // requestAnimationFrame–based draw scheduling
    let rafId = null;
    function scheduleDraw() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        draw();
        rafId = null;
      });
    }

    const state = reactive({
      panX: 0, panY: 0, zoom: 1,
      isPanning: false,
      isRectSelecting: false,
      rectStart: { gx: 0, gy: 0 },
      rectCurrent: { gx: 0, gy: 0 },
      selectedCells: [...props.selectedTiles],
      clickCount: 0, lastClickTime: 0,
      startX: 0, startY: 0,
      selectionMode: 'toggle'
    });

    function cellSize() { return props.settings.gridSize; }
    function computeAllKeys() {
      const size = cellSize();
      if (!img.width || !img.height) return [];
      const cols = Math.ceil(img.width / size);
      const rows = Math.ceil(img.height / size);
      const out = [];
      for (let x = 0; x < cols; x++)
        for (let y = 0; y < rows; y++)
          out.push(`${x},${y}`);
      return out;
    }

    function draw() {
      if (!img.complete) return;
      const canvas    = previewCanvas.value;
      const container = previewContainer.value;
      const ctx       = canvas.getContext('2d');
      const cw = container.clientWidth, ch = container.clientHeight;
      canvas.width = cw; canvas.height = ch;
      ctx.clearRect(0,0,cw,ch);

      ctx.save();
      ctx.translate(state.panX, state.panY);
      ctx.scale(state.zoom, state.zoom);

      const size = cellSize(), imgW = img.width, imgH = img.height;
      const def  = props.settings;

      // visible range
      const left   = -state.panX/state.zoom;
      const top    = -state.panY/state.zoom;
      const right  = (cw-state.panX)/state.zoom;
      const bottom = (ch-state.panY)/state.zoom;
      const startX = Math.floor(left/size), endX = Math.floor(right/size);
      const startY = Math.floor(top/size),  endY = Math.floor(bottom/size);

      // draw each tile
      for (let gx = startX; gx <= endX; gx++){
        for (let gy = startY; gy <= endY; gy++){
          const cellX = gx*size, cellY = gy*size;
          if (cellX+size<0||cellY+size<0||cellX>=imgW||cellY>=imgH) continue;
          const key = `${gx},${gy}`;
          const base = { ...def };
          const over = props.perTileSettings[key] || {};
          const cfg  = { ...base, ...over };

          ctx.save();
          ctx.filter =
            `brightness(${100+cfg.brightness}%) contrast(${100+cfg.contrast}%) blur(${cfg.blur}px)` +
            (cfg.filterMethod==='sepia'?` sepia(${cfg.filterStrength}%)`:'') +
            (cfg.filterMethod==='grayscale'?` grayscale(${cfg.filterStrength}%)`:'') +
            (cfg.filterMethod==='invert'?` invert(${cfg.filterStrength}%)`:'');
          ctx.translate(cellX+size/2+cfg.offsetX, cellY+size/2+cfg.offsetY);
          ctx.rotate(cfg.rotation*Math.PI/180);
          ctx.scale(cfg.scale, cfg.scale);
          ctx.drawImage(
            img,
            cellX, cellY, sliceW, sliceH,
            -cfg.tileWidth/2, -cfg.tileHeight/2,
            cfg.tileWidth, cfg.tileHeight
          );
          ctx.restore();
        }
      }

      // grid
      if (def.showGrid) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1/state.zoom;
        for (let x = startX; x <= endX+1; x++){
          ctx.moveTo(x*size, startY*size);
          ctx.lineTo(x*size,(endY+1)*size);
        }
        for (let y = startY; y <= endY+1; y++){
          ctx.moveTo(startX*size,y*size);
          ctx.lineTo((endX+1)*size,y*size);
        }
        ctx.stroke(); ctx.restore();
      }

      // per-tile selection overlay
      if (!props.settings.selectAll && state.selectedCells.length) {
        const coords = state.selectedCells.map(k=>{
          const [gx,gy] = k.split(',').map(Number);
          return { gx, gy };
        });
        const xs = coords.map(c=>c.gx), ys = coords.map(c=>c.gy);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);

        coords.forEach(({gx,gy})=>{
          ctx.save();
          ctx.strokeStyle='red';
          ctx.lineWidth=1/state.zoom;
          ctx.strokeRect(gx*size,gy*size,size,size);
          ctx.restore();
        });
        ctx.save();
        ctx.strokeStyle='red';
        ctx.lineWidth=3/state.zoom;
        ctx.strokeRect(minX*size,minY*size,(maxX-minX+1)*size,(maxY-minY+1)*size);
        ctx.restore();
      }

      ctx.restore();
    }

    // schedule initial draw
    onMounted(()=>
      nextTick(()=>{
        state.panX = previewContainer.value.clientWidth/2;
        state.panY = previewContainer.value.clientHeight/2;
        scheduleDraw();
      })
    );

    // watch props → scheduleDraw
    watch(() => props.settings, scheduleDraw, { deep: true });
    watch(() => props.perTileSettings, scheduleDraw, { deep: true });
    watch(() => props.selectedTiles, sel => { state.selectedCells = [...sel]; scheduleDraw(); });
    watch(() => props.settings.selectAll, sel => {
      state.selectedCells = sel ? computeAllKeys() : [];
      state.selectionMode = 'toggle';
      emit('update:selectedTiles', [...state.selectedCells]);
      scheduleDraw();
    });

    watch(() => props.imageUrl, url => {
        if (!url) return;
        img.src = url;
        img.onload = () => {
          sliceW = props.settings.tileWidth;
          sliceH = props.settings.tileHeight;
          scheduleDraw();
        };
      },
      { immediate: true }
    );

    // USER INTERACTIONS (pan, select, marquee) – unchanged
    function onWheel(e) {
      const r = previewCanvas.value.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const wx = (mx - state.panX) / state.zoom, wy = (my - state.panY) / state.zoom;
      const delta = e.deltaY < 0 ? 1.1 : 0.9;
      state.zoom *= delta;
      state.panX = mx - wx * state.zoom;
      state.panY = my - wy * state.zoom;
      scheduleDraw();
    }

    function onMouseDown(e) {
      if (props.settings.selectAll && e.button === 0) return;
      if (e.button === 0) {
        const now = Date.now();
        state.clickCount = now - state.lastClickTime < 400 ? state.clickCount + 1 : 1;
        state.lastClickTime = now;
        if (state.clickCount === 2) {
          state.selectedCells = [];
          emit('update:settings', { ...props.settings, selectAll: false });
          emit('update:selectedTiles', []);
          scheduleDraw();
          return;
        }
      }

      const rect = previewCanvas.value.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const wx = (mx - state.panX) / state.zoom, wy = (my - state.panY) / state.zoom;
      const gx = Math.floor(wx / cellSize()), gy = Math.floor(wy / cellSize());
      const key = `${gx},${gy}`;
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (e.button === 0 && isCtrl && isShift) {
        state.isRectSelecting = true;
        state.rectStart = { gx, gy };
        state.rectCurrent = { gx, gy };
        state.selectionMode = 'marquee';
        return;
      }

      if (e.button === 0 && isCtrl && !isShift) {
        state.isRectSelecting = false;
        state.selectionMode = 'toggle';
        const idx = state.selectedCells.indexOf(key);
        if (idx >= 0) state.selectedCells.splice(idx, 1);
        else state.selectedCells.push(key);
        emit('update:settings', { ...props.settings, selectAll: false });
        emit('update:selectedTiles', [...state.selectedCells]);
        scheduleDraw();
        return;
      }

      if (e.button === 0 && !isCtrl && !isShift) {
        state.isRectSelecting = false;
        state.selectionMode = 'toggle';
        state.selectedCells = [key];
        emit('update:settings', { ...props.settings, selectAll: false });
        emit('update:selectedTiles', [...state.selectedCells]);
        scheduleDraw();
        return;
      }

      if (e.button === 2) {
        state.isPanning = true;
        state.startX = e.clientX - state.panX;
        state.startY = e.clientY - state.panY;
      }
    }

    function onDrag(e) {
      if (state.isPanning) {
        state.panX = e.clientX - state.startX;
        state.panY = e.clientY - state.startY;
        scheduleDraw();
      }
      if (state.isRectSelecting) {
        const rect = previewCanvas.value.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const wx = (mx - state.panX) / state.zoom, wy = (my - state.panY) / state.zoom;
        state.rectCurrent = {
          gx: Math.floor(wx / cellSize()),
          gy: Math.floor(wy / cellSize())
        };
        scheduleDraw();
      }
    }

    function onMouseUp() {
      if (state.isRectSelecting) {
        const rs = state.rectStart, rc = state.rectCurrent;
        const minX = Math.min(rs.gx, rc.gx), maxX = Math.max(rs.gx, rc.gx);
        const minY = Math.min(rs.gy, rc.gy), maxY = Math.max(rs.gy, rc.gy);

        state.selectedCells = [];
        for (let x = minX; x <= maxX; x++)
          for (let y = minY; y <= maxY; y++)
            state.selectedCells.push(`${x},${y}`);
        state.isRectSelecting = false;
        emit('update:settings', { ...props.settings, selectAll: false });
        emit('update:selectedTiles', [...state.selectedCells]);
        scheduleDraw();
      }
      if (state.isPanning) state.isPanning = false;
    }

    return {
      previewCanvas,
      previewContainer,
      onWheel,
      onMouseDown,
      onDrag,
      onMouseUp,
      exportBlob
    };
  }
};
</script>

<style scoped>
.preview-container {
  width: 100%; height: 100%;
  position: relative; overflow: hidden;
  user-select: none;
}
canvas {
  display: block;
  position: absolute;
  top: 0; left: 0;
}
</style> -->

