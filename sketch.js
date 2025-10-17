

let table;
let items = []; // { row, peaks }

function preload() {
  table = loadTable("./dataset_02.csv", "csv", "header");
}

function setup() {
  // estraggo dati dal CSV
  for (let r = 0; r < table.getRowCount(); r++) {
    const row = table.getRow(r);
    const peaks = [
      Number(row.get('column0')),
      Number(row.get('column1')),
      Number(row.get('column2')),
      Number(row.get('column3')),
      Number(row.get('column4'))
    ];
    items.push({ row, peaks });
  }

  // crea canvas e disegna (layout responsive mantenuto)
  calculateLayoutAndCreateCanvas();
  noLoop();
}

/* ---------------- layout  ---------------- */
function calculateLayoutAndCreateCanvas() {
  const outerPadding = 24;
  const padding = 12;
  const itemSize = Math.max(64, Math.floor(Math.min(windowWidth, 300) * 0.22));

  let cols = Math.floor((windowWidth - outerPadding * 2) / (itemSize + padding));
  if (cols < 1) cols = 1;

  let rows = Math.ceil(items.length / cols);

  const totalHeight = outerPadding * 2 + rows * itemSize + (rows - 1) * padding;
  const h = Math.max(totalHeight, windowHeight);
  createCanvas(windowWidth, h);
  background(255);

  drawGrid(items, outerPadding, padding, itemSize, cols);
}

function drawGrid(items, outerPadding, padding, itemSize, cols) {
  background(255);
 
  let colCounter = 0;
  let rowCounter = 0;

  for (let i = 0; i < items.length; i++) {
    const xPos = outerPadding + colCounter * (itemSize + padding);
    const yPos = outerPadding + rowCounter * (itemSize + padding);

    const cx = xPos + itemSize / 2;
    const cy = yPos + itemSize / 2;

    // box leggero (opzionale)
    noFill();
    stroke(230);
    strokeWeight(1);
    rect(xPos, yPos, itemSize, itemSize, 10);

    // parametri generali del glifo (non toccare il layout)
    const outerDiameter = itemSize * 0.86;      // diametro visivo complessivo
    const baseR = (outerDiameter / 2) * 0.98;   // raggio di riferimento corrispondente a fattore 1.0
    // nota: r finali = baseR * rFactor (dove rFactor ∈ [0.5, 1.5])

    push();
    translate(cx, cy);

    // disegno il glifo con la nuova logica
    drawGlyphNew(items[i].peaks, baseR);

    pop();

    // avanzamento nella griglia
    colCounter++;
    if (colCounter >= cols) {
      colCounter = 0;
      rowCounter++;
    }
  }
}

/* ---------------- funzione principale per il nuovo glifo ----------------
   peaks: array di 5 valori -100..100
   baseR: raggio corrispondente a rFactor = 1.0
   logica:
   - per ogni settore (5), il punto centrale (bisettrice) avrà rFactor = map(val, -100..100 -> 0.5..1.5)
   - agli estremi di ciascun settore rFactor = 1.0
   - interpolazione interna con envelope sin(pi*t) per avere 0 ai bordi e 1 al centro
   - disegno forma nera piena, poi disegno cerchio pieno con compositing 'destination-out'
     per sottrarre la porzione di intersezione (quindi l'intersezione diventa trasparente)
*/
function drawGlyphNew(peaks, baseR) {
  // sicurezza: peaks lunghezza 5
  const sectors = 5;
  const sectorAngle = TWO_PI / sectors;
  const startAngle = -HALF_PI; // primo settore bisettrice in alto (-90 deg)
  const samplesPerSector = 64; // più alto = più liscio

  // 1) costruisco i punti della forma nera che passa per il rFactor centrale di ogni settore
  const pts = [];
  for (let s = 0; s < sectors; s++) {
    const rawVal = peaks[s] || 0;
    // mappa -100..100 -> 0.5..1.5 (negativi -> <1.0, zero -> 1.0, positivi -> >1.0)
    const centerFactor = map(rawVal, -100, 100, 0.5, 1.5);
    const sectorStart = startAngle + s * sectorAngle;
    for (let k = 0; k < samplesPerSector; k++) {
      const t = k / (samplesPerSector - 1); // 0..1 all'interno dello spicchio
      // envelope: 0 ai bordi, 1 al centro
      const env = Math.sin(PI * t); // sin(pi*t): 0..1..0
      // interpolazione fattore radiale: ai bordi 1.0, al centro centerFactor
      const rFactor = 1.0 + (centerFactor - 1.0) * env;
      const r = baseR * rFactor;
      const ang = sectorStart + t * sectorAngle;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      pts.push({ x, y });
    }
  }

  // per smoothing con curveVertex, preparo array duplicando alcuni punti
  const curvePts = [];
  const N = pts.length;
  // aggiungo ultimi 3 per avvio morbido della curva
  curvePts.push(pts[N - 3], pts[N - 2], pts[N - 1]);
  for (let p of pts) curvePts.push(p);
  // chiudo con primi 3
  curvePts.push(pts[0], pts[1], pts[2]);

  // 2) disegno la shape nera piena (shape completa)
  noStroke();
  fill(0);
  beginShape();
  for (let p of curvePts) {
    // uso curveVertex per morbidezza
    curveVertex(p.x, p.y);
  }
  endShape(CLOSE);

  // 3) ora creo la circonferenza piena corrispondente a rFactor = 1.0 (baseR)
  //    e la sottraggo dalla precedente forma usando globalCompositeOperation = 'destination-out'
  const ctx = drawingContext;
  ctx.save();
  // destination-out: la forma disegnata cancella i pixel già presenti -> l'intersezione diventa trasparente
  ctx.globalCompositeOperation = 'destination-out';

  // disegno il cerchio pieno (qualsiasi colore, sarà usato come maschera)
  blendMode(DIFFERENCE);
  noStroke(); 
  fill(255);
  // disegno con beginPath su drawingContext per massima compatibilità
  // ma p5 ellipse funziona e verrà applicata la compositing mode, quindi la uso:
  ellipse(0, 0, baseR * 2, baseR * 2);

  ctx.restore();

  // 4) opzionale: se vuoi che la parte centrale (foratura) rimanga bianca già c'è (sottratta)
  //    non aggiungo altro: l'intersezione ora è trasparente -> sul fondo bianco risulterà bianco.
}

/* draw vuoto (disegno effettuato in setup) */
function draw() { }

/* windowResized: ricrea il canvas e ridisegna mantenendo items */
function windowResized() {
  clear();
  const currentItems = items.slice();
  items = currentItems;
  calculateLayoutAndCreateCanvas();
}
