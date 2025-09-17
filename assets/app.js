/* =========================================================================
   Calculator Pro — Padrão, Científica e Programador
   Autor: (insira seu nome/empresa)
   Descrição: Lógica completa, teclado, histórico, conversões e bitwise.
   ========================================================================= */

/* ===============================
   Utilidades gerais
   =============================== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// Toast reutilizável
let toast;
function showToast(msg) {
  $('#toastMsg').textContent = msg;
  toast ??= new bootstrap.Toast($('#liveToast'), { delay: 2000 });
  toast.show();
}

// Persistência simples
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }
};

// Tema
(function themeInit() {
  const saved = store.get('theme', 'dark');
  document.documentElement.setAttribute('data-bs-theme', saved);
  updateThemeIcon(saved);
})();
$('#themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-bs-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-bs-theme', next);
  store.set('theme', next);
  updateThemeIcon(next);
});
function updateThemeIcon(theme) {
  const i = $('#themeIcon');
  i.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
}

// Ano no rodapé
$('#year').textContent = new Date().getFullYear();

// Exportar “configurações” (tema e históricos) como JSON
$('#exportSettings').addEventListener('click', () => {
  const data = {
    theme: document.documentElement.getAttribute('data-bs-theme'),
    stdHistory: store.get('stdHistory', []),
    sciHistory: store.get('sciHistory', []),
    progHistory: store.get('progHistory', [])
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'calculator-pro-settings.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Configurações exportadas.');
});

/* ===============================
   Motor de expressão (seguro)
   - Shunting-yard para + - * / ^ %
   - Parênteses e números decimais
   - Funções científicas mapeadas à frente
   =============================== */

// Previne uso de eval para segurança e previsibilidade
const Operators = {
  '+': { p: 1, assoc: 'L', fn: (a,b) => a + b },
  '-': { p: 1, assoc: 'L', fn: (a,b) => a - b },
  '*': { p: 2, assoc: 'L', fn: (a,b) => a * b },
  '/': { p: 2, assoc: 'L', fn: (a,b) => a / b },
  '%': { p: 2, assoc: 'L', fn: (a,b) => a % b },
  '^': { p: 3, assoc: 'R', fn: (a,b) => Math.pow(a,b) },
};

const SciFns = {
  sin: (x, mode) => Math.sin(mode === 'deg' ? x * Math.PI / 180 : x),
  cos: (x, mode) => Math.cos(mode === 'deg' ? x * Math.PI / 180 : x),
  tan: (x, mode) => Math.tan(mode === 'deg' ? x * Math.PI / 180 : x),
  ln:  (x) => Math.log(x),
  log: (x) => Math.log10(x),
  sqrt:(x) => Math.sqrt(x),
  sqr: (x) => x * x,
  inv: (x) => 1 / x,
  fact:(x) => {
    if (x < 0 || !Number.isFinite(x)) return NaN;
    if (Math.floor(x) !== x) return gamma(x + 1); // extensão com Gamma
    let r = 1; for (let i=2; i<=x; i++) r *= i; return r;
  },
};
// Aproximação de Gamma (Lanczos simplificada)
function gamma(z){
  const g=7, p=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if(z<0.5) return Math.PI/(Math.sin(Math.PI*z)*gamma(1-z));
  z-=1; let x=p[0]; for(let i=1;i<p.length;i++) x+=p[i]/(z+i);
  const t=z+g+0.5; return Math.sqrt(2*Math.PI)*Math.pow(t,z+0.5)*Math.exp(-t)*x;
}

// Tokenização simples: números, ponto, funções, operadores e parênteses
function tokenize(expr) {
  const tokens = [];
  const re = /([A-Za-z]+)|([0-9]*\.?[0-9]+)|([+\-*/^()%])|(\s+)/g;
  let m;
  while ((m = re.exec(expr)) !== null) {
    if (m[4]) continue;           // ignora espaços
    if (m[1]) tokens.push({ t:'fn', v:m[1] });
    else if (m[2]) tokens.push({ t:'num', v:parseFloat(m[2]) });
    else if (m[3]) tokens.push({ t:'op', v:m[3] });
  }
  return tokens;
}

// Converte para RPN (Reverse Polish Notation)
function toRPN(tokens) {
  const out=[], stack=[];
  for (let i=0;i<tokens.length;i++){
    const x=tokens[i];
    if (x.t==='num') out.push(x);
    else if (x.t==='fn') stack.push(x);
    else if (x.t==='op') {
      if (x.v==='(') stack.push(x);
      else if (x.v===')') {
        while (stack.length && stack[stack.length-1].v!=='(') out.push(stack.pop());
        stack.pop(); // remove '('
        if (stack.length && stack[stack.length-1].t==='fn') out.push(stack.pop());
      } else {
        // operador
        const o1 = Operators[x.v];
        if (!o1) continue;
        while (stack.length) {
          const top = stack[stack.length-1];
          const o2 = Operators[top.v];
          if (!o2) break;
          if ((o1.assoc==='L' && o1.p<=o2.p) || (o1.assoc==='R' && o1.p<o2.p)) out.push(stack.pop());
          else break;
        }
        stack.push(x);
      }
    }
  }
  while (stack.length) out.push(stack.pop());
  return out;
}

// Avalia RPN; aceita funções unárias vindo do tokenizador (ex.: sin 30)
function evalRPN(rpn, angleMode='deg') {
  const st=[];
  for (const x of rpn) {
    if (x.t==='num') st.push(x.v);
    else if (x.t==='op') {
      const b = st.pop(), a = st.pop();
      const r = Operators[x.v].fn(a,b);
      st.push(r);
    } else if (x.t==='fn') {
      const fname = x.v.toLowerCase();
      if (fname==='pi') st.push(Math.PI);
      else if (fname==='e') st.push(Math.E);
      else if (SciFns[fname]) {
        const a = st.pop();
        st.push(SciFns[fname](a, angleMode));
      }
    }
  }
  return st.pop();
}

// Sanitiza e adapta expressão de exibidores (%, vírgula, etc.)
function normalizeExpression(expr) {
  // vírgula para ponto
  expr = expr.replace(/,/g,'.');
  // % como /100 (comportamento simples e previsível)
  expr = expr.replace(/%/g,' % ');
  return expr;
}

/* ===============================
   Módulo Padrão
   =============================== */
const stdDisplay = $('#std-display');
const stdHistoryLine = $('#std-history-line');
const stdHistoryList = $('#std-history');
let stdMem = 0;
let stdCurrent = '0';

function stdUpdateDisplay(v) {
  stdDisplay.value = v;
}

function stdAppend(ch) {
  if (stdCurrent === '0' && /[0-9.]/.test(ch)) stdCurrent = ch;
  else stdCurrent += ch;
  stdUpdateDisplay(stdCurrent);
}

function stdClearEntry() {
  // Limpa último número digitado (simples: reinicia linha)
  stdCurrent = '0';
  stdUpdateDisplay(stdCurrent);
}

function stdClearAll() {
  stdCurrent = '0';
  stdUpdateDisplay(stdCurrent);
  stdHistoryLine.textContent = '';
}

function stdBackspace() {
  if (stdCurrent.length <= 1) stdCurrent = '0';
  else stdCurrent = stdCurrent.slice(0,-1);
  stdUpdateDisplay(stdCurrent);
}

function stdInsertNumber(n) {
  if (stdCurrent === '0') stdCurrent = String(n);
  else stdCurrent += String(n);
  stdUpdateDisplay(stdCurrent);
}

function stdInsertDot() {
  // adiciona ponto se último token for número e não tiver ponto corrente
  const parts = stdCurrent.split(/[^0-9.]/);
  const last = parts[parts.length-1];
  if (!last.includes('.')) {
    stdCurrent += '.';
    stdUpdateDisplay(stdCurrent);
  }
}

function stdInsertOp(op) {
  // impede duplicação de operadores
  if (/[+\-*/^%]$/.test(stdCurrent)) stdCurrent = stdCurrent.slice(0,-1);
  stdCurrent += op;
  stdUpdateDisplay(stdCurrent);
}

function stdFn(action) {
  let v = parseFloat(stdDisplay.value.replace(',','.'));
  if (action==='sqrt') v = Math.sqrt(v);
  if (action==='sqr')  v = v*v;
  if (action==='inv')  v = 1/v;
  if (action==='sign') v = -v;
  if (action==='pi')   v = Math.PI;
  if (action==='e')    v = Math.E;
  stdCurrent = String(v);
  stdUpdateDisplay(stdCurrent);
}

function stdEq() {
  try {
    const expr = normalizeExpression(stdCurrent);
    const rpn = toRPN(tokenize(expr));
    const value = evalRPN(rpn);
    if (!Number.isFinite(value)) throw new Error('Resultado inválido');
    // histórico
    stdAddHistory(stdCurrent, value);
    stdHistoryLine.textContent = stdCurrent + ' =';
    stdCurrent = String(value);
    stdUpdateDisplay(stdCurrent);
  } catch (e) {
    showToast('Expressão inválida');
  }
}

// Memória
function stdMemAction(act) {
  const v = parseFloat(stdDisplay.value);
  if (act==='MC') stdMem = 0;
  if (act==='MR') { stdCurrent = String(stdMem); stdUpdateDisplay(stdCurrent); }
  if (act==='M+') stdMem += v;
  if (act==='M-') stdMem -= v;
  if (act==='MS') stdMem = v;
}

function stdAddHistory(expr, val) {
  const item = document.createElement('li');
  item.innerHTML = `<span class="expr mono">${expr}</span><span class="val mono">${val}</span>`;
  stdHistoryList.prepend(item);
  const saved = store.get('stdHistory', []);
  saved.unshift({ expr, val });
  store.set('stdHistory', saved.slice(0,100));
}

function stdLoadHistory() {
  const saved = store.get('stdHistory', []);
  for (const {expr,val} of saved) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="expr mono">${expr}</span><span class="val mono">${val}</span>`;
    stdHistoryList.append(li);
  }
}
stdLoadHistory();

$('#btnCopyHistoryStd').addEventListener('click', () => {
  const text = $$('#std-history li').map(li => li.innerText).join('\n');
  navigator.clipboard.writeText(text).then(()=>showToast('Histórico copiado.'));
});
$('#btnClearHistoryStd').addEventListener('click', () => {
  stdHistoryList.innerHTML = '';
  store.set('stdHistory', []);
  showToast('Histórico limpo.');
});

// Eventos botões Padrão
for (const b of $$('#pane-standard .btn-grid .btn')) {
  b.addEventListener('click', () => {
    const { action, num, dot, op, eq, fn, input } = b.dataset;
    if (num) return stdInsertNumber(num);
    if (dot!==undefined) return stdInsertDot();
    if (op) return stdInsertOp(op);
    if (eq) return stdEq();
    if (fn) return stdFn(fn);
    if (input) { stdAppend(input); return; }
    if (action==='CE') return stdClearEntry();
    if (action==='C') return stdClearAll();
    if (action==='BS') return stdBackspace();
    if (['MC','MR','M+','M-','MS'].includes(action)) return stdMemAction(action);
  });
}

/* ===============================
   Módulo Científica
   =============================== */
const sciDisplay = $('#sci-display');
const sciHistoryList = $('#sci-history');
const sciHistoryLine = $('#sci-history-line');
let sciCurrent = '0';

function sciUpdateDisplay(v){ sciDisplay.value = v; }
function sciAppend(ch){ sciCurrent = sciCurrent==='0'? ch : sciCurrent + ch; sciUpdateDisplay(sciCurrent); }
function sciClearEntry(){ sciCurrent='0'; sciUpdateDisplay(sciCurrent); }
function sciClearAll(){ sciCurrent='0'; sciUpdateDisplay(sciCurrent); sciHistoryLine.textContent=''; }
function sciBackspace(){ sciCurrent = sciCurrent.length>1? sciCurrent.slice(0,-1) : '0'; sciUpdateDisplay(sciCurrent); }

function sciInsertNumber(n){ sciAppend(String(n)); }
function sciInsertDot(){
  const parts = sciCurrent.split(/[^0-9.]/);
  const last = parts[parts.length-1];
  if (!last.includes('.')) sciAppend('.');
}
function sciInsertOp(op){
  if (/[+\-*/^%]$/.test(sciCurrent)) sciCurrent = sciCurrent.slice(0,-1);
  sciAppend(op);
}
function sciFn(name){
  let v = parseFloat(sciDisplay.value.replace(',','.'));
  if (name==='sqrt') v=Math.sqrt(v);
  if (name==='sqr')  v=v*v;
  if (name==='inv')  v=1/v;
  if (name==='sign') v=-v;
  if (name==='pi')   v=Math.PI;
  if (name==='e')    v=Math.E;
  if (name==='fact') v= SciFns.fact(v);
  if (['sin','cos','tan','ln','log'].includes(name)) {
    // Para funções inseridas “como botão”, aplicamos diretamente ao valor atual
    const mode = $('#deg').checked ? 'deg' : 'rad';
    if (name==='sin') v = SciFns.sin(v, mode);
    if (name==='cos') v = SciFns.cos(v, mode);
    if (name==='tan') v = SciFns.tan(v, mode);
    if (name==='ln')  v = SciFns.ln(v);
    if (name==='log') v = SciFns.log(v);
  }
  sciCurrent = String(v);
  sciUpdateDisplay(sciCurrent);
}

function sciPowInsert(){
  sciInsertOp('^');
}

function sciEq(){
  try {
    const expr = normalizeExpression(sciCurrent);
    const mode = $('#deg').checked ? 'deg' : 'rad';
    // Convertemos funções textuais no tokenizer: permitimos sin( ... ) etc.
    const rpn = toRPN(tokenize(expr));
    const value = evalRPN(rpn, mode);
    if (!Number.isFinite(value)) throw new Error('Inválido');
    sciAddHistory(sciCurrent, value);
    sciHistoryLine.textContent = sciCurrent + ' =';
    sciCurrent = String(value);
    sciUpdateDisplay(sciCurrent);
  } catch(e) {
    showToast('Expressão inválida');
  }
}

function sciAddHistory(expr, val){
  const li = document.createElement('li');
  li.innerHTML = `<span class="expr mono">${expr}</span><span class="val mono">${val}</span>`;
  sciHistoryList.prepend(li);
  const saved = store.get('sciHistory', []);
  saved.unshift({ expr, val });
  store.set('sciHistory', saved.slice(0,100));
}
(function sciLoadHistory(){
  const saved = store.get('sciHistory', []);
  for (const {expr,val} of saved) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="expr mono">${expr}</span><span class="val mono">${val}</span>`;
    sciHistoryList.append(li);
  }
})();

$('#btnCopyHistorySci').addEventListener('click', () => {
  const text = $$('#sci-history li').map(li => li.innerText).join('\n');
  navigator.clipboard.writeText(text).then(()=>showToast('Histórico copiado.'));
});
$('#btnClearHistorySci').addEventListener('click', () => {
  sciHistoryList.innerHTML = '';
  store.set('sciHistory', []);
  showToast('Histórico limpo.');
});

// Eventos botões Científica
for (const b of $$('#pane-scientific .btn-grid .btn')) {
  b.addEventListener('click', () => {
    const { action, num, dot, op, eq, fn } = b.dataset;
    if (num) return sciInsertNumber(num);
    if (dot!==undefined) return sciInsertDot();
    if (op) return sciInsertOp(op);
    if (eq) return sciEq();
    if (fn==='pow') return sciPowInsert();
    if (fn) return sciFn(fn);
    if (action==='CE') return sciClearEntry();
    if (action==='C') return sciClearAll();
  });
}

/* ===============================
   Programador — Bases/Bitwise
   =============================== */
const baseSelect = $('#baseSelect');
const wordSize = $('#wordSize');
const signedMode = $('#signedMode');

const binInput = $('#binInput');
const octInput = $('#octInput');
const decInput = $('#decInput');
const hexInput = $('#hexInput');

const progKeypad = $('#progKeypad');
const progOperandB = $('#progOperandB');
const progHistoryList = $('#prog-history');

function clampToWord(value) {
  const bits = parseInt(wordSize.value, 10);
  const mask = bits >= 32 ? (bits===32 ? 0xFFFFFFFF : (2n**BigInt(bits))-1n) : ((1<<bits)-1);
  // usar BigInt para 64 bits
  if (typeof mask === 'number') {
    value = Number(BigInt(value) & BigInt(mask));
  } else {
    value = (BigInt(value) & mask);
  }
  return value;
}

function normalizeSigned(value) {
  const bits = parseInt(wordSize.value, 10);
  const bigMask = (2n**BigInt(bits));
  const maxUnsigned = bigMask - 1n;
  let v = BigInt(value) & maxUnsigned;
  if (signedMode.value==='signed') {
    const signBit = 1n << (BigInt(bits)-1n);
    if ((v & signBit) !== 0n) {
      v = v - bigMask; // two's complement
    }
  }
  return v;
}

function toAllBasesFromDec(decVal) {
  // decVal pode ser string ou BigInt/number
  let v = BigInt(decVal);
  const bits = parseInt(wordSize.value, 10);
  const mask = (2n**BigInt(bits))-1n;
  v = v & mask; // respeita largura
  const signedV = normalizeSigned(v);
  return {
    bin: v.toString(2),
    oct: v.toString(8),
    dec: signedMode.value==='signed' ? signedV.toString() : v.toString(10),
    hex: v.toString(16).toUpperCase()
  };
}

function parseByBase(str, base) {
  if (!str || !str.trim()) return 0n;
  const clean = str.trim();
  const v = BigInt(parseInt(clean, base));
  return v;
}

function updateAllFromActive(activeField) {
  try {
    let base = 10, str='';
    if (activeField===binInput) base=2,  str=binInput.value;
    if (activeField===octInput) base=8,  str=octInput.value;
    if (activeField===decInput) base=10, str=decInput.value;
    if (activeField===hexInput) base=16, str=hexInput.value;

    let v = parseByBase(str, base);
    const all = toAllBasesFromDec(v);

    // Atualiza todos sem recursão
    if (activeField!==binInput) binInput.value = all.bin;
    if (activeField!==octInput) octInput.value = all.oct;
    if (activeField!==decInput) decInput.value = all.dec;
    if (activeField!==hexInput) hexInput.value = all.hex;
  } catch {
    showToast('Valor inválido para a base selecionada.');
  }
}

// Reage a digitação
[binInput, octInput, decInput, hexInput].forEach(inp => {
  inp.addEventListener('input', () => updateAllFromActive(inp));
});

// Botões de cópia
$$('[data-copy]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = $(btn.dataset.copy);
    navigator.clipboard.writeText(target.value || '').then(()=>showToast('Copiado.'));
  });
});

// Limpar
$('#btnClearProg').addEventListener('click', () => {
  binInput.value = octInput.value = decInput.value = hexInput.value = '';
  progOperandB.value = '';
  showToast('Limpo.');
});

// Gera teclas conforme base
function rebuildProgKeypad() {
  const base = parseInt(baseSelect.value,10);
  const groups = [];
  // Dígitos válidos
  const digits = [];
  for (let i=0;i<Math.min(base,10);i++) digits.push(String(i));
  if (base>10) {
    const hexLetters = ['A','B','C','D','E','F'];
    for (let i=10;i<base;i++) digits.push(hexLetters[i-10]);
  }
  // Layout: dígitos + utilidades
  progKeypad.innerHTML = '';
  const frag = document.createDocumentFragment();

  const makeBtn = (label, attrs={}) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.textContent = label;
    for (const [k,v] of Object.entries(attrs)) b.dataset[k]=v;
    b.addEventListener('click', onProgKeyClick);
    return b;
  };

  // Botões de dígitos
  digits.forEach(d => frag.appendChild(makeBtn(d, {digit:d})));

  // Utilitários
  const utilWrap = (cls='btn btn-outline-secondary')=>{
    const b=document.createElement('button'); b.className=cls; b.addEventListener('click',onProgKeyClick); return b;
  };
  const bs = utilWrap(); bs.dataset.action='BS'; bs.innerHTML='<i class="bi bi-backspace"></i>';
  const clr= utilWrap('btn btn-outline-danger'); clr.dataset.action='C'; clr.textContent='C';
  const paste = utilWrap(); paste.dataset.action='PASTE'; paste.innerHTML='<i class="bi bi-clipboard-plus"></i>';

  frag.appendChild(bs); frag.appendChild(clr); frag.appendChild(paste);

  // Insere
  progKeypad.appendChild(frag);
}
function onProgKeyClick(e){
  const base = parseInt(baseSelect.value,10);
  const active = base===2?binInput : base===8?octInput : base===10?decInput : hexInput;
  const { digit, action } = e.currentTarget.dataset;
  if (digit) {
    active.value += digit;
    updateAllFromActive(active);
  } else if (action==='BS') {
    active.value = active.value.slice(0,-1);
    updateAllFromActive(active);
  } else if (action==='C') {
    active.value='';
    updateAllFromActive(active);
  } else if (action==='PASTE') {
    navigator.clipboard.readText().then(txt=>{
      active.value = String(txt).trim();
      updateAllFromActive(active);
    });
  }
}
rebuildProgKeypad();
baseSelect.addEventListener('change', rebuildProgKeypad);
[wordSize, signedMode].forEach(el => el.addEventListener('change', () => updateAllFromActive(
  parseInt(baseSelect.value,10)===2?binInput:parseInt(baseSelect.value,10)===8?octInput:parseInt(baseSelect.value,10)===10?decInput:hexInput
)));

// Bitwise
let pendingBitOp = null;
$$('[data-bit]').forEach(btn => {
  btn.addEventListener('click', () => {
    pendingBitOp = btn.dataset.bit; // AND, OR, XOR, NOT, SHL, SHR
    showToast(`Operação: ${pendingBitOp}`);
  });
});

$('#btnApplyShift').addEventListener('click', () => {
  pendingBitOp = 'SHIFT';
  showToast('Operação: SHIFT');
});

$('#btnApplyBitwise').addEventListener('click', () => {
  const base = parseInt(baseSelect.value,10);
  const A = parseByBase((base===2?binInput:base===8?octInput:base===10?decInput:hexInput).value, base);
  let result;

  const bits = parseInt(wordSize.value,10);
  const mask = (2n**BigInt(bits))-1n;

  if (!pendingBitOp) return showToast('Selecione uma operação bitwise.');

  if (pendingBitOp==='NOT') {
    result = (~A) & mask;
  } else if (pendingBitOp==='SHL' || pendingBitOp==='SHR' || pendingBitOp==='SHIFT') {
    const n = BigInt(parseInt($('#shiftAmount').value || '1',10));
    if (pendingBitOp==='SHL' || pendingBitOp==='SHIFT') result = (A << n) & mask;
    else result = (A >> n) & mask; // lógico
  } else {
    const B = parseByBase(progOperandB.value, base);
    if (pendingBitOp==='AND') result = (A & B) & mask;
    if (pendingBitOp==='OR')  result = (A | B) & mask;
    if (pendingBitOp==='XOR') result = (A ^ B) & mask;
  }

  // Aplica e mostra em todos
  const all = toAllBasesFromDec(result);
  binInput.value = all.bin; octInput.value=all.oct; decInput.value=all.dec; hexInput.value=all.hex;

  // Histórico programador
  progAddHistory({
    op: pendingBitOp,
    base,
    a: (base===2?binInput:base===8?octInput:base===10?decInput:hexInput).value,
    b: progOperandB.value || null,
    result: all
  });

  showToast('Operação aplicada.');
  pendingBitOp = null;
});

function progAddHistory(item) {
  const li = document.createElement('li');
  const right = `<span class="val mono">${item.result.dec} (dec) • ${item.result.hex}h</span>`;
  const left  = `<span class="expr mono">${item.op}${item.b?`(${item.a}, ${item.b})`:`(${item.a})`} [base ${item.base}]</span>`;
  li.innerHTML = left + right;
  progHistoryList.prepend(li);

  const saved = store.get('progHistory', []);
  saved.unshift(item);
  store.set('progHistory', saved.slice(0,100));
}
(function progLoadHistory(){
  const saved = store.get('progHistory', []);
  for (const h of saved) {
    const li = document.createElement('li');
    const right = `<span class="val mono">${h.result.dec} (dec) • ${h.result.hex}h</span>`;
    const left  = `<span class="expr mono">${h.op}${h.b?`(${h.a}, ${h.b})`:`(${h.a})`} [base ${h.base}]</span>`;
    li.innerHTML = left + right;
    progHistoryList.append(li);
  }
})();

$('#btnCopyHistoryProg').addEventListener('click', () => {
  const text = $$('#prog-history li').map(li => li.innerText).join('\n');
  navigator.clipboard.writeText(text).then(()=>showToast('Histórico copiado.'));
});
$('#btnClearHistoryProg').addEventListener('click', () => {
  progHistoryList.innerHTML = '';
  store.set('progHistory', []);
  showToast('Histórico limpo.');
});

/* ===============================
   Suporte a Teclado (Padrão/Científica)
   =============================== */
function handleKey(e, mode) {
  const isStd = mode==='std';
  const insertNum = isStd ? stdInsertNumber : sciInsertNumber;
  const insertOp  = isStd ? stdInsertOp    : sciInsertOp;
  const insertDot = isStd ? stdInsertDot   : sciInsertDot;
  const backspace = isStd ? stdBackspace   : sciBackspace;
  const clearAll  = isStd ? stdClearAll    : sciClearAll;
  const eq        = isStd ? stdEq          : sciEq;

  if (/[0-9]/.test(e.key)) insertNum(e.key);
  else if (['+','-','*','/','^','%','(',')'].includes(e.key)) insertOp(e.key);
  else if (e.key === '.' || e.key===',') insertDot();
  else if (e.key === 'Backspace') backspace();
  else if (e.key === 'Escape') clearAll();
  else if (e.key === 'Enter' || e.key === '=') eq();
}
document.addEventListener('keydown', (e) => {
  const activeTab = $('.tab-pane.active')?.id;
  if (activeTab==='pane-standard') handleKey(e,'std');
  if (activeTab==='pane-scientific') handleKey(e,'sci');
});

/* ===============================
   Fim
   =============================== */
