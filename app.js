/**
 * סימן מים בקליק - Watermark Easy
 * קוד מלא עם שמירת הגדרות ב-localStorage, בחירת זווית במעלות בודדות,
 * תמיכה בבחירת יעד שמירה, והעלאת לוגו מרכזית.
 */

const STORAGE_KEY = 'watermark_easy_settings_v2';
const LOGO_STORAGE_KEY = 'watermark_easy_logo_data_v2';

// מצב האפליקציה (State)
const state = {
  watermarkType: 'text', // 'text' | 'image'
  text: 'כל הזכויות שמורות ©',
  logoImage: null,
  logoFileName: '',
  logoDataUrl: null,
  position: 'center',    // 9 אפשרויות
  bgStyle: 'none',       // 'none' | 'dark' | 'light'
  opacity: 0.6,
  sizeLevel: 3,          // 1 עד 5
  textColor: '#ffffff',
  rotation: 0,           // זווית מדויקת במעלות (-180 עד 180)
  
  // יעד שמירה
  destChoice: 'source_subfolder', // 'source_subfolder' | 'custom_folder' | 'downloads'
  customOutputDirHandle: null,
  customOutputDirName: '',

  // קבצים לעיבוד
  selectedFiles: [],     // [{ file, name, type, handle }]
  folderHandle: null,    // תיקיית מקור
  
  // תצוגה מקדימה
  sampleIndex: 0,
  currentPreviewFileIndex: 0,
  userPreviewImage: null
};

// אלמנטים מה-DOM
const elements = {
  // סוג סימן מים
  watermarkTypeRadios: document.querySelectorAll('input[name="watermarkType"]'),
  textSection: document.getElementById('textSection'),
  imageSection: document.getElementById('imageSection'),
  watermarkText: document.getElementById('watermarkText'),
  textColor: document.getElementById('textColor'),
  colorDots: document.querySelectorAll('.color-dot'),
  
  // לוגו
  logoInput: document.getElementById('logoInput'),
  logoDropZone: document.getElementById('logoDropZone'),
  logoEmptyView: document.getElementById('logoEmptyView'),
  logoActiveView: document.getElementById('logoActiveView'),
  logoThumbImg: document.getElementById('logoThumbImg'),
  logoFileNameText: document.getElementById('logoFileNameText'),
  removeLogoBtn: document.getElementById('removeLogoBtn'),

  // סגנון וזווית
  bgStyleRadios: document.querySelectorAll('input[name="bgStyle"]'),
  opacitySlider: document.getElementById('opacitySlider'),
  opacityValue: document.getElementById('opacityValue'),
  sizeSlider: document.getElementById('sizeSlider'),
  sizeValue: document.getElementById('sizeValue'),
  angleSlider: document.getElementById('angleSlider'),
  angleNumberInput: document.getElementById('angleNumberInput'),
  anglePresets: document.querySelectorAll('.btn-preset'),
  posButtons: document.querySelectorAll('.pos-btn'),

  // תצוגה מקדימה
  previewCanvas: document.getElementById('previewCanvas'),
  previewNav: document.getElementById('previewNav'),
  prevPreviewBtn: document.getElementById('prevPreviewBtn'),
  nextPreviewBtn: document.getElementById('nextPreviewBtn'),
  previewIndexText: document.getElementById('previewIndexText'),
  changeSampleBtn: document.getElementById('changeSampleBtn'),
  previewNote: document.getElementById('previewNote'),

  // בחירת קבצים
  pickFolderBtn: document.getElementById('pickFolderBtn'),
  fallbackFolderInput: document.getElementById('fallbackFolderInput'),
  pickFilesInput: document.getElementById('pickFilesInput'),
  dropZone: document.getElementById('dropZone'),
  selectedFilesSummary: document.getElementById('selectedFilesSummary'),
  filesCountText: document.getElementById('filesCountText'),
  folderOriginText: document.getElementById('folderOriginText'),
  clearFilesBtn: document.getElementById('clearFilesBtn'),

  // יעד שמירה
  destChoiceRadios: document.querySelectorAll('input[name="destChoice"]'),
  customFolderRow: document.getElementById('customFolderRow'),
  chooseCustomFolderBtn: document.getElementById('chooseCustomFolderBtn'),
  chosenCustomFolderName: document.getElementById('chosenCustomFolderName'),

  // פעולה ושמירה
  startProcessBtn: document.getElementById('startProcessBtn'),
  startBtnLabel: document.getElementById('startBtnLabel'),
  progressArea: document.getElementById('progressArea'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  progressPercent: document.getElementById('progressPercent'),
  completedMessage: document.getElementById('completedMessage'),
  completedDetails: document.getElementById('completedDetails'),
  downloadZipContainer: document.getElementById('downloadZipContainer'),
  downloadZipBtn: document.getElementById('downloadZipBtn'),
  resetSettingsBtn: document.getElementById('resetSettingsBtn'),
  installAppBtn: document.getElementById('installAppBtn')
};

const sizeLabels = ['קטן מאוד', 'קטן', 'בינוני', 'גדול', 'ענק'];

/* ========================================================
   אתחול
   ======================================================== */
window.addEventListener('DOMContentLoaded', async () => {
  await loadSavedSettings();
  initEventListeners();
  renderPreview();
  setupPWA();
});

/* ========================================================
   ניהול שמירת הגדרות (Persistence ב-localStorage)
   ======================================================== */
async function loadSavedSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.watermarkType) state.watermarkType = saved.watermarkType;
      if (saved.text !== undefined) state.text = saved.text;
      if (saved.textColor) state.textColor = saved.textColor;
      if (saved.bgStyle) state.bgStyle = saved.bgStyle;
      if (saved.opacity !== undefined) state.opacity = saved.opacity;
      if (saved.sizeLevel !== undefined) state.sizeLevel = saved.sizeLevel;
      if (saved.rotation !== undefined) state.rotation = saved.rotation;
      if (saved.position) state.position = saved.position;
      if (saved.destChoice) state.destChoice = saved.destChoice;
    }

    // טעינת לוגו שמור (DataURL)
    const savedLogo = localStorage.getItem(LOGO_STORAGE_KEY);
    if (savedLogo) {
      const logoData = JSON.parse(savedLogo);
      if (logoData.dataUrl) {
        state.logoDataUrl = logoData.dataUrl;
        state.logoFileName = logoData.fileName || 'logo.png';
        await loadLogoFromDataUrl(logoData.dataUrl, state.logoFileName);
      }
    }
  } catch (err) {
    console.warn('שגיאה בטעינת הגדרות שמורות:', err);
  }

  applyStateToUI();
}

function saveSettings() {
  try {
    const settings = {
      watermarkType: state.watermarkType,
      text: state.text,
      textColor: state.textColor,
      bgStyle: state.bgStyle,
      opacity: state.opacity,
      sizeLevel: state.sizeLevel,
      rotation: state.rotation,
      position: state.position,
      destChoice: state.destChoice
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    if (state.logoDataUrl) {
      localStorage.setItem(LOGO_STORAGE_KEY, JSON.stringify({
        dataUrl: state.logoDataUrl,
        fileName: state.logoFileName
      }));
    } else {
      localStorage.removeItem(LOGO_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('שגיאה בשמירת הגדרות:', err);
  }
}

function resetSettings() {
  if (confirm('האם לאפס את כל ההגדרות לברירת המחדל?')) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LOGO_STORAGE_KEY);
    location.reload();
  }
}

function applyStateToUI() {
  // סוג סימן מים
  elements.watermarkTypeRadios.forEach(radio => {
    radio.checked = (radio.value === state.watermarkType);
  });
  toggleWatermarkTypeView();

  // טקסט
  elements.watermarkText.value = state.text;
  elements.textColor.value = state.textColor;
  updateActiveColorDot(state.textColor);

  // סגנון רקע
  elements.bgStyleRadios.forEach(radio => {
    radio.checked = (radio.value === state.bgStyle);
  });

  // שקיפות
  const opPercent = Math.round(state.opacity * 100);
  elements.opacitySlider.value = opPercent;
  elements.opacityValue.textContent = `${opPercent}%`;

  // גודל
  elements.sizeSlider.value = state.sizeLevel;
  elements.sizeValue.textContent = sizeLabels[state.sizeLevel - 1];

  // זווית
  setRotationAngle(state.rotation, false);

  // מיקום (9 אפשרויות)
  elements.posButtons.forEach(btn => {
    if (btn.dataset.pos === state.position) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // יעד שמירה
  elements.destChoiceRadios.forEach(radio => {
    radio.checked = (radio.value === state.destChoice);
  });
  toggleCustomFolderRow();
}

/* ========================================================
   האזנה לאירועים
   ======================================================== */
function initEventListeners() {
  // בחירת סוג סימן מים (טקסט או תמונה)
  elements.watermarkTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.watermarkType = e.target.value;
      toggleWatermarkTypeView();
      saveSettings();
      renderPreview();
    });
  });

  // טקסט סימן מים
  elements.watermarkText.addEventListener('input', (e) => {
    state.text = e.target.value;
    saveSettings();
    renderPreview();
  });

  // צבע טקסט
  elements.textColor.addEventListener('input', (e) => {
    state.textColor = e.target.value;
    updateActiveColorDot(e.target.value);
    saveSettings();
    renderPreview();
  });

  elements.colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const color = dot.dataset.color;
      elements.textColor.value = color;
      state.textColor = color;
      updateActiveColorDot(color);
      saveSettings();
      renderPreview();
    });
  });

  // לוגו
  elements.logoInput.addEventListener('change', handleLogoFileInput);
  elements.removeLogoBtn.addEventListener('click', removeLogo);
  setupLogoDropZone();

  // סגנון רקע
  elements.bgStyleRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.bgStyle = e.target.value;
      saveSettings();
      renderPreview();
    });
  });

  // שקיפות
  elements.opacitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    state.opacity = val / 100;
    elements.opacityValue.textContent = `${val}%`;
    saveSettings();
    renderPreview();
  });

  // גודל
  elements.sizeSlider.addEventListener('input', (e) => {
    state.sizeLevel = parseInt(e.target.value, 10);
    elements.sizeValue.textContent = sizeLabels[state.sizeLevel - 1];
    saveSettings();
    renderPreview();
  });

  // זווית סיבוב מדויקת (סליידר + קלט מספר)
  elements.angleSlider.addEventListener('input', (e) => {
    setRotationAngle(parseInt(e.target.value, 10));
  });

  elements.angleNumberInput.addEventListener('input', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 0;
    if (val < -180) val = -180;
    if (val > 180) val = 180;
    setRotationAngle(val);
  });

  // כפתורי קיצור לזוויות
  elements.anglePresets.forEach(btn => {
    btn.addEventListener('click', () => {
      setRotationAngle(parseInt(btn.dataset.angle, 10));
    });
  });

  // 9 מיקומים
  elements.posButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.posButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.position = btn.dataset.pos;
      saveSettings();
      renderPreview();
    });
  });

  // בחירת יעד שמירה
  elements.destChoiceRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.destChoice = e.target.value;
      toggleCustomFolderRow();
      saveSettings();
    });
  });

  elements.chooseCustomFolderBtn.addEventListener('click', handlePickCustomOutputFolder);

  // תצוגה מקדימה - החלפת דוגמה
  elements.changeSampleBtn.addEventListener('click', () => {
    state.sampleIndex = (state.sampleIndex + 1) % 3;
    renderPreview();
  });

  // ניווט תצוגה מקדימה
  elements.prevPreviewBtn.addEventListener('click', () => {
    if (state.selectedFiles.length > 0) {
      state.currentPreviewFileIndex = (state.currentPreviewFileIndex - 1 + state.selectedFiles.length) % state.selectedFiles.length;
      loadUserPreviewImage();
    }
  });

  elements.nextPreviewBtn.addEventListener('click', () => {
    if (state.selectedFiles.length > 0) {
      state.currentPreviewFileIndex = (state.currentPreviewFileIndex + 1) % state.selectedFiles.length;
      loadUserPreviewImage();
    }
  });

  // בחירת קבצים ותיקיות
  elements.pickFolderBtn.addEventListener('click', handlePickFolder);
  elements.fallbackFolderInput.addEventListener('change', handleFallbackFolderSelect);
  elements.pickFilesInput.addEventListener('change', (e) => {
    handleSelectedFiles(Array.from(e.target.files));
  });
  elements.clearFilesBtn.addEventListener('click', clearSelectedFiles);
  setupDragAndDrop();

  // פעולות כלליות
  elements.startProcessBtn.addEventListener('click', startProcessing);
  elements.resetSettingsBtn.addEventListener('click', resetSettings);
}

function toggleWatermarkTypeView() {
  if (state.watermarkType === 'text') {
    elements.textSection.style.display = 'block';
    elements.imageSection.style.display = 'none';
  } else {
    elements.textSection.style.display = 'none';
    elements.imageSection.style.display = 'block';
  }
}

function toggleCustomFolderRow() {
  if (state.destChoice === 'custom_folder') {
    elements.customFolderRow.style.display = 'flex';
  } else {
    elements.customFolderRow.style.display = 'none';
  }
}

function setRotationAngle(angle, triggerSave = true) {
  state.rotation = angle;
  elements.angleSlider.value = angle;
  elements.angleNumberInput.value = angle;

  // עדכון כפתורי קיצור פעילים
  elements.anglePresets.forEach(btn => {
    if (parseInt(btn.dataset.angle, 10) === angle) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (triggerSave) {
    saveSettings();
  }
  renderPreview();
}

function updateActiveColorDot(colorHex) {
  elements.colorDots.forEach(dot => {
    if (dot.dataset.color.toLowerCase() === colorHex.toLowerCase()) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

/* ========================================================
   טיפול בלוגו (העלאה, תצוגה ושמירה)
   ======================================================== */
function handleLogoFileInput(e) {
  const file = e.target.files[0];
  if (!file) return;
  processLogoFile(file);
}

function setupLogoDropZone() {
  const zone = elements.logoDropZone;

  ['dragenter', 'dragover'].forEach(name => {
    zone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    zone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('dragover');
    });
  });

  zone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files).filter(f => /\.(png|jpe?g|webp)$/i.test(f.name));
    if (files.length > 0) {
      processLogoFile(files[0]);
    }
  });
}

function processLogoFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    state.logoDataUrl = dataUrl;
    state.logoFileName = file.name;
    await loadLogoFromDataUrl(dataUrl, file.name);
    saveSettings();
    renderPreview();
  };
  reader.readAsDataURL(file);
}

function loadLogoFromDataUrl(dataUrl, fileName) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      state.logoImage = img;
      elements.logoThumbImg.src = dataUrl;
      elements.logoFileNameText.textContent = fileName || 'לוגו שמור';
      elements.logoEmptyView.style.display = 'none';
      elements.logoActiveView.style.display = 'flex';
      resolve();
    };
    img.src = dataUrl;
  });
}

function removeLogo() {
  state.logoImage = null;
  state.logoFileName = '';
  state.logoDataUrl = null;
  elements.logoInput.value = '';
  elements.logoThumbImg.src = '';
  elements.logoEmptyView.style.display = 'flex';
  elements.logoActiveView.style.display = 'none';
  saveSettings();
  renderPreview();
}

/* ========================================================
   תצוגה מקדימה (Live Preview)
   ======================================================== */
function renderPreview() {
  const canvas = elements.previewCanvas;
  const ctx = canvas.getContext('2d');

  if (state.userPreviewImage) {
    canvas.width = state.userPreviewImage.width;
    canvas.height = state.userPreviewImage.height;
    ctx.drawImage(state.userPreviewImage, 0, 0);
  } else {
    canvas.width = 800;
    canvas.height = 530;
    drawSampleGraphic(ctx, canvas.width, canvas.height, state.sampleIndex);
  }

  drawWatermark(ctx, canvas.width, canvas.height);
}

function drawSampleGraphic(ctx, w, h, index) {
  if (index === 0) {
    // שקיעה
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.75);
    sky.addColorStop(0, '#1e3a8a');
    sky.addColorStop(0.4, '#db2777');
    sky.addColorStop(0.7, '#f97316');
    sky.addColorStop(1, '#fde047');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.65, 55, 0, Math.PI * 2);
    ctx.fillStyle = '#fffbeb';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#4c0519';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.75);
    ctx.lineTo(w * 0.25, h * 0.5);
    ctx.lineTo(w * 0.55, h * 0.72);
    ctx.lineTo(w * 0.85, h * 0.45);
    ctx.lineTo(w, h * 0.7);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    const lake = ctx.createLinearGradient(0, h * 0.75, 0, h);
    lake.addColorStop(0, '#f97316');
    lake.addColorStop(1, '#0f172a');
    ctx.fillStyle = lake;
    ctx.fillRect(0, h * 0.78, w, h * 0.22);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    drawBird(ctx, w * 0.2, h * 0.3, 16);
    drawBird(ctx, w * 0.26, h * 0.25, 20);
    drawBird(ctx, w * 0.33, h * 0.32, 14);

  } else if (index === 1) {
    // חוף ים
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, '#38bdf8');
    sky.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const sea = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.85);
    sea.addColorStop(0, '#0284c7');
    sea.addColorStop(1, '#0d9488');
    ctx.fillStyle = sea;
    ctx.fillRect(0, h * 0.55, w, h * 0.3);

    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.95, w * 0.6, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(0, h * 0.82, w, h * 0.18);

  } else {
    // מסמך PDF
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('מסמך רשמי לדוגמה - קובץ PDF', w / 2, 85);

    ctx.fillStyle = '#94a3b8';
    for (let i = 0; i < 9; i++) {
      const y = 140 + i * 36;
      ctx.fillRect(80, y, w - 160, 14);
    }
  }
}

function drawBird(ctx, x, y, size) {
  ctx.beginPath();
  ctx.arc(x - size / 2, y, size / 2, Math.PI, 0);
  ctx.arc(x + size / 2, y, size / 2, Math.PI, 0);
  ctx.stroke();
}

/* ========================================================
   ציור סימן המים (כולל 9 מיקומים, שקיפות וזווית מדויקת)
   ======================================================== */
function drawWatermark(ctx, imgWidth, imgHeight) {
  const baseDim = Math.min(imgWidth, imgHeight);
  const sizeScales = [0.035, 0.05, 0.07, 0.10, 0.14];
  const scale = sizeScales[state.sizeLevel - 1];
  const fontSize = Math.max(16, Math.round(baseDim * scale));

  ctx.save();

  if (state.watermarkType === 'image') {
    if (state.logoImage) {
      drawLogoWatermark(ctx, imgWidth, imgHeight, baseDim);
    } else {
      // אם נבחרה תמונה אך טרם הועלתה, נציג חותמת הדגמה ברורה
      drawPlaceholderLogoWatermark(ctx, imgWidth, imgHeight, baseDim, fontSize);
    }
  } else {
    drawTextWatermark(ctx, imgWidth, imgHeight, baseDim, fontSize);
  }

  ctx.restore();
}

function drawTextWatermark(ctx, imgWidth, imgHeight, baseDim, fontSize) {
  const text = state.text.trim();
  if (!text) return;

  ctx.font = `bold ${fontSize}px "Segoe UI", Assistant, Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const paddingX = fontSize * 0.5;
  const paddingY = fontSize * 0.35;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize * 1.4;

  const coords = calculate9PositionCoordinates(state.position, imgWidth, imgHeight, boxWidth, boxHeight, baseDim);

  ctx.translate(coords.x, coords.y);

  if (state.rotation !== 0) {
    ctx.rotate((state.rotation * Math.PI) / 180);
  }

  if (state.bgStyle !== 'none') {
    ctx.save();
    if (state.bgStyle === 'dark') {
      ctx.fillStyle = `rgba(15, 23, 42, ${state.opacity * 0.75})`;
    } else {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.opacity * 0.85})`;
    }
    const r = boxHeight * 0.25;
    roundRect(ctx, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, r);
    ctx.fill();
    ctx.restore();
  }

  ctx.globalAlpha = state.opacity;
  ctx.fillStyle = state.textColor;

  if (state.bgStyle === 'none') {
    ctx.shadowColor = isColorLight(state.textColor) ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
    ctx.shadowBlur = Math.max(3, fontSize * 0.1);
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
  }

  ctx.fillText(text, 0, 0);
}

function drawLogoWatermark(ctx, imgWidth, imgHeight, baseDim) {
  const logo = state.logoImage;
  const targetWidth = baseDim * (0.08 + state.sizeLevel * 0.04);
  const targetHeight = (logo.height / logo.width) * targetWidth;

  const coords = calculate9PositionCoordinates(state.position, imgWidth, imgHeight, targetWidth, targetHeight, baseDim);

  ctx.translate(coords.x, coords.y);

  if (state.rotation !== 0) {
    ctx.rotate((state.rotation * Math.PI) / 180);
  }

  if (state.bgStyle !== 'none') {
    const pad = targetHeight * 0.12;
    ctx.save();
    if (state.bgStyle === 'dark') {
      ctx.fillStyle = `rgba(15, 23, 42, ${state.opacity * 0.75})`;
    } else {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.opacity * 0.85})`;
    }
    roundRect(ctx, -targetWidth / 2 - pad, -targetHeight / 2 - pad, targetWidth + pad * 2, targetHeight + pad * 2, 8);
    ctx.fill();
    ctx.restore();
  }

  ctx.globalAlpha = state.opacity;
  ctx.drawImage(logo, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
}

function drawPlaceholderLogoWatermark(ctx, imgWidth, imgHeight, baseDim, fontSize) {
  const boxWidth = fontSize * 4.5;
  const boxHeight = fontSize * 2;
  const coords = calculate9PositionCoordinates(state.position, imgWidth, imgHeight, boxWidth, boxHeight, baseDim);

  ctx.translate(coords.x, coords.y);

  if (state.rotation !== 0) {
    ctx.rotate((state.rotation * Math.PI) / 180);
  }

  ctx.save();
  ctx.fillStyle = 'rgba(37, 99, 235, 0.4)';
  roundRect(ctx, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.restore();

  ctx.globalAlpha = state.opacity;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(fontSize * 0.65)}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🖼️ העלו לוגו בשביל תצוגה מקדימה', 0, 0);
}

function calculate9PositionCoordinates(position, imgWidth, imgHeight, elementWidth, elementHeight, baseDim) {
  const margin = Math.max(20, Math.round(baseDim * 0.04));

  const leftX = margin + elementWidth / 2;
  const centerX = imgWidth / 2;
  const rightX = imgWidth - margin - elementWidth / 2;

  const topY = margin + elementHeight / 2;
  const centerY = imgHeight / 2;
  const bottomY = imgHeight - margin - elementHeight / 2;

  switch (position) {
    case 'top-right':    return { x: rightX, y: topY };
    case 'top-center':   return { x: centerX, y: topY };
    case 'top-left':     return { x: leftX, y: topY };
    
    case 'middle-right': return { x: rightX, y: centerY };
    case 'center':       return { x: centerX, y: centerY };
    case 'middle-left':  return { x: leftX, y: centerY };
    
    case 'bottom-right': return { x: rightX, y: bottomY };
    case 'bottom-center':return { x: centerX, y: bottomY };
    case 'bottom-left':  return { x: leftX, y: bottomY };
    
    default:             return { x: centerX, y: centerY };
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function isColorLight(hex) {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16) || 0;
  const g = parseInt(color.substring(2, 4), 16) || 0;
  const b = parseInt(color.substring(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/* ========================================================
   בחירת קבצים, תיקיות ויעד שמירה
   ======================================================== */
async function handlePickFolder() {
  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      state.folderHandle = dirHandle;

      const files = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          if (isSupportedFile(file.name)) {
            files.push({
              file: file,
              name: file.name,
              type: getFileType(file.name),
              handle: entry
            });
          }
        }
      }

      if (files.length === 0) {
        alert('בתיקייה שנבחרה לא נמצאו תמונות או קובצי PDF.');
        return;
      }

      state.selectedFiles = files;
      updateFilesSummary(true, dirHandle.name);
      loadUserPreviewImage();

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('שגיאה בבחירת תיקייה:', err);
        elements.fallbackFolderInput.click();
      }
    }
  } else {
    elements.fallbackFolderInput.click();
  }
}

function handleFallbackFolderSelect(e) {
  const fileList = Array.from(e.target.files);
  state.folderHandle = null;
  handleSelectedFiles(fileList, 'תיקייה מקומית');
}

function handleSelectedFiles(fileList, sourceName = '') {
  const validFiles = fileList
    .filter(f => isSupportedFile(f.name))
    .map(f => ({
      file: f,
      name: f.name,
      type: getFileType(f.name)
    }));

  if (validFiles.length === 0) {
    alert('לא נבחרו קבצים נתמכים. יש לבחור תמונות (JPG, PNG, WEBP) או קובצי PDF.');
    return;
  }

  state.selectedFiles = validFiles;
  updateFilesSummary(false, sourceName);
  loadUserPreviewImage();
}

async function handlePickCustomOutputFolder() {
  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      state.customOutputDirHandle = dirHandle;
      state.customOutputDirName = dirHandle.name;
      elements.chosenCustomFolderName.textContent = `נבחרה תיקיית יעד: "${dirHandle.name}" ✅`;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('לא נבחרה תיקייה מותאמת:', err);
      }
    }
  } else {
    alert('הדפדפן אינו תומך בבחירת תיקיית יעד ישירה. הקבצים יישמרו בתיקיית ההורדות.');
  }
}

function isSupportedFile(fileName) {
  return /\.(jpg|jpeg|png|webp|bmp|pdf)$/i.test(fileName);
}

function getFileType(fileName) {
  return /\.pdf$/i.test(fileName) ? 'pdf' : 'image';
}

function updateFilesSummary(isFolder, folderName) {
  const count = state.selectedFiles.length;
  const imgCount = state.selectedFiles.filter(f => f.type === 'image').length;
  const pdfCount = state.selectedFiles.filter(f => f.type === 'pdf').length;

  let desc = `נבחרו ${count} קבצים לעיבוד`;
  if (imgCount > 0 && pdfCount > 0) {
    desc += ` (${imgCount} תמונות, ${pdfCount} קובצי PDF)`;
  } else if (imgCount > 0) {
    desc += ` (${imgCount} תמונות)`;
  } else if (pdfCount > 0) {
    desc += ` (${pdfCount} קובצי PDF)`;
  }

  elements.filesCountText.textContent = desc;
  
  if (isFolder) {
    elements.folderOriginText.textContent = `📁 נבחרה תיקיית מקור: "${folderName}"`;
  } else {
    elements.folderOriginText.textContent = '📄 נבחרו קבצים בודדים';
  }

  elements.selectedFilesSummary.style.display = 'flex';
  elements.startProcessBtn.disabled = false;
  elements.startBtnLabel.textContent = `הוסף חותמת ל-${count} הקבצים עכשיו!`;

  elements.previewNav.style.display = 'flex';
  updatePreviewNavIndex();
}

function clearSelectedFiles() {
  state.selectedFiles = [];
  state.folderHandle = null;
  state.userPreviewImage = null;
  state.currentPreviewFileIndex = 0;

  elements.selectedFilesSummary.style.display = 'none';
  elements.startProcessBtn.disabled = true;
  elements.startBtnLabel.textContent = 'קודם בחרו קבצים בשלב 2';
  elements.previewNav.style.display = 'none';
  elements.previewNote.textContent = '🌟 זוהי תמונת הדגמה כדי שתראו כיצד החותמת תיראה.';
  elements.changeSampleBtn.style.display = 'inline-block';
  elements.completedMessage.style.display = 'none';
  elements.progressArea.style.display = 'none';

  renderPreview();
}

function loadUserPreviewImage() {
  if (state.selectedFiles.length === 0) return;

  const currentItem = state.selectedFiles[state.currentPreviewFileIndex];
  updatePreviewNavIndex();

  if (currentItem.type === 'image') {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.userPreviewImage = img;
        elements.previewNote.textContent = `תצוגה מקדימה של הקובץ: "${currentItem.name}"`;
        elements.changeSampleBtn.style.display = 'none';
        renderPreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(currentItem.file);
  } else {
    state.userPreviewImage = null;
    elements.previewNote.textContent = `קובץ PDF: "${currentItem.name}" (החותמת תוטבע על כל דפי המסמך)`;
    elements.changeSampleBtn.style.display = 'none';
    state.sampleIndex = 2;
    renderPreview();
  }
}

function updatePreviewNavIndex() {
  elements.previewIndexText.textContent = `${state.currentPreviewFileIndex + 1} מתוך ${state.selectedFiles.length}`;
}

function setupDragAndDrop() {
  const dropZone = elements.dropZone;

  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    if (files.length > 0) {
      handleSelectedFiles(files);
    }
  });
}

/* ========================================================
   עיבוד הקבצים ושמירה לפי היעד שנבחר
   ======================================================== */
async function startProcessing() {
  if (state.selectedFiles.length === 0) return;

  elements.startProcessBtn.disabled = true;
  elements.progressArea.style.display = 'block';
  elements.completedMessage.style.display = 'none';
  elements.downloadZipContainer.style.display = 'none';

  const total = state.selectedFiles.length;
  let processed = 0;
  const processedResults = [];

  // קביעת תיקיית יעד לשמירה
  let targetDirHandle = null;

  if (state.destChoice === 'custom_folder' && state.customOutputDirHandle) {
    targetDirHandle = state.customOutputDirHandle;
  } else if (state.destChoice === 'source_subfolder' && state.folderHandle) {
    try {
      targetDirHandle = await state.folderHandle.getDirectoryHandle('תמונות_עם_סימן_מים', { create: true });
    } catch (err) {
      console.warn('לא הצלחנו ליצור תת-תיקייה במקור:', err);
    }
  }

  for (let i = 0; i < total; i++) {
    const item = state.selectedFiles[i];
    updateProgress(i, total, `מעבד את הקובץ: ${item.name}...`);

    try {
      let resultBlob = null;
      const baseName = item.name.replace(/\.[^/.]+$/, '');
      const ext = item.name.split('.').pop();
      const outputFileName = `${baseName}_watermark.${ext}`;

      if (item.type === 'image') {
        resultBlob = await processImageFile(item.file);
      } else if (item.type === 'pdf') {
        resultBlob = await processPdfFile(item.file);
      }

      if (resultBlob) {
        if (targetDirHandle) {
          const fileHandle = await targetDirHandle.getFileHandle(outputFileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(resultBlob);
          await writable.close();
        } else {
          processedResults.push({ blob: resultBlob, name: outputFileName });
        }
      }
    } catch (err) {
      console.error(`שגיאה בעיבוד ${item.name}:`, err);
    }

    processed++;
    updateProgress(processed, total, `הושלם ${processed} מתוך ${total}...`);
  }

  finishProcessing(targetDirHandle, processedResults);
}

function updateProgress(current, total, statusText) {
  const percent = Math.round((current / total) * 100);
  elements.progressBar.style.width = `${percent}%`;
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressText.textContent = statusText;
}

function processImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0);
        drawWatermark(ctx, img.width, img.height);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob((blob) => {
          resolve(blob);
        }, mimeType, 0.94);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function processPdfFile(file) {
  if (!window.PDFLib) {
    throw new Error('ספריית PDF-Lib אינה טעונה.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    const offCanvas = document.createElement('canvas');
    const scale = 2;
    offCanvas.width = width * scale;
    offCanvas.height = height * scale;
    const offCtx = offCanvas.getContext('2d');
    offCtx.scale(scale, scale);

    drawWatermark(offCtx, width, height);

    const pngDataUrl = offCanvas.toDataURL('image/png');
    const pngImage = await pdfDoc.embedPng(pngDataUrl);

    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: width,
      height: height
    });
  }

  const modifiedPdfBytes = await pdfDoc.save();
  return new Blob([modifiedPdfBytes], { type: 'application/pdf' });
}

function finishProcessing(targetDirHandle, processedResults) {
  elements.startProcessBtn.disabled = false;
  elements.progressArea.style.display = 'none';
  elements.completedMessage.style.display = 'block';

  if (targetDirHandle) {
    const folderName = state.destChoice === 'custom_folder' 
      ? `התיקייה שבחרתם: "${state.customOutputDirName}"`
      : 'התיקייה החדשה: "תמונות_עם_סימן_מים" (בתוך תיקיית המקור)';

    elements.completedDetails.innerHTML = `
      כל הקבצים נשמרו ישירות במחשב שלכם בהצלחה!<br>
      מיקום השמירה: <strong>${folderName}</strong>.
    `;
  } else {
    if (processedResults.length === 1) {
      downloadBlob(processedResults[0].blob, processedResults[0].name);
      elements.completedDetails.textContent = `הקובץ "${processedResults[0].name}" נשמר בתיקיית ההורדות של המחשב שלכם.`;
    } else if (processedResults.length > 1) {
      elements.completedDetails.textContent = `כל ${processedResults.length} הקבצים עובדו בהצלחה!`;
      elements.downloadZipContainer.style.display = 'block';

      elements.downloadZipBtn.onclick = async () => {
        elements.downloadZipBtn.disabled = true;
        elements.downloadZipBtn.textContent = 'מכין קובץ ZIP... אנא המתינו';

        const zip = new window.JSZip();
        processedResults.forEach(item => {
          zip.file(item.name, item.blob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, 'קבצים_עם_סימן_מים.zip');

        elements.downloadZipBtn.disabled = false;
        elements.downloadZipBtn.innerHTML = '<span class="btn-icon">💾</span> הורד שוב קובץ ZIP';
      };

      elements.downloadZipBtn.click();
    }
  }
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ========================================================
   תמיכה ב-PWA
   ======================================================== */
let deferredPrompt = null;

function setupPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.log('Service Worker רישום לא פעיל:', err);
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    elements.installAppBtn.style.display = 'inline-flex';
  });

  elements.installAppBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        elements.installAppBtn.style.display = 'none';
      }
      deferredPrompt = null;
    }
  });
}
