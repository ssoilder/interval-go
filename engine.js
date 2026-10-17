(function (root) {
  'use strict';
  const clone = x => JSON.parse(JSON.stringify(x));
  function topology(config) {
    const n = config.size;
    if (!Number.isInteger(n) || n < 5 || n > 25) throw new Error('Invalid size');
    const active = Array(n * n).fill(true);
    const hole = config.mode === 'classic' ? 'none' : config.hole;
    const width = Math.min(config.cutSize || 3, n - 2);
    const start = Math.floor((n - width) / 2);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const midR = r >= start && r < start + width, midC = c >= start && c < start + width;
      const depth = Math.min(config.depth || 2, n - 2);
      const edge = (config.edge === 'top' && r < depth && midC) || (config.edge === 'bottom' && r >= n-depth && midC) || (config.edge === 'left' && c < depth && midR) || (config.edge === 'right' && c >= n-depth && midR);
      if ((hole === 'center' || hole === 'both') && midR && midC || (hole === 'edge' || hole === 'both') && edge) active[r*n+c] = false;
    }
    const neighbors = active.map((on, id) => {
      if (!on) return [];
      const r = Math.floor(id/n), c = id%n;
      const offsets = [[0,-1],[0,1],[-1,0],[1,0]];
      if (config.mode === 'triangle') offsets.push([-1,r%2 ? 1 : -1],[1,r%2 ? 1 : -1]);
      return offsets.map(([dr,dc]) => [r+dr,c+dc]).filter(([y,x])=>y>=0&&y<n&&x>=0&&x<n&&active[y*n+x]).map(([y,x])=>y*n+x);
    });
    return { active, neighbors };
  }
  function group(board, graph, id) {
    const color = board[id], stones = new Set([id]), liberties = new Set(), todo = [id];
    while (todo.length) for (const p of graph.neighbors[todo.pop()]) {
      if (board[p] === 0) liberties.add(p);
      else if (board[p] === color && !stones.has(p)) { stones.add(p); todo.push(p); }
    }
    return { stones: [...stones], liberties: [...liberties] };
  }
  function create(config) {
    const graph = topology(config), board = Array(config.size ** 2).fill(0);
    return { version: 1, config: clone(config), board, turn: 1, captures: [0,0,0], moves: [], positions: [board.join('')], history: [], passes: 0, phase: 'play', dead: [], accepted: [], result: null };
  }
  function snapshot(g) {
    return {board:[...g.board],turn:g.turn,captures:[...g.captures],movesLength:g.moves.length,positionsLength:g.positions.length,passes:g.passes,phase:g.phase,dead:[...g.dead],accepted:[...g.accepted],result:clone(g.result)};
  }
  function play(g, id) {
    if (g.phase !== 'play') return { error: 'finished' };
    const graph = topology(g.config);
    if (!Number.isInteger(id) || !graph.active[id]) return { error: 'holeError' };
    if (g.board[id]) return { error: 'occupied' };
    const board = [...g.board], opponent = 3-g.turn;
    board[id] = g.turn;
    let captured = 0;
    for (const p of graph.neighbors[id]) if (board[p] === opponent) {
      const chain = group(board,graph,p);
      if (!chain.liberties.length) { captured += chain.stones.length; chain.stones.forEach(s=>board[s]=0); }
    }
    if (!group(board,graph,id).liberties.length) return { error: 'suicide' };
    const hash = board.join('');
    if (g.positions.includes(hash)) return { error: 'ko' };
    g.history.push(snapshot(g));
    g.board = board; g.positions.push(hash); g.captures[g.turn] += captured;
    g.moves.push({color:g.turn,id,captured}); g.turn=opponent; g.passes=0;
    return { captured };
  }
  function pass(g) {
    if (g.phase !== 'play') return false;
    g.history.push(snapshot(g)); g.moves.push({color:g.turn,id:null,captured:0});
    g.turn=3-g.turn; g.passes++;
    if (g.passes>=2) { g.phase='scoring'; g.dead=[]; g.accepted=[]; }
    return true;
  }
  function undo(g) {
    if (!g.history.length || g.phase==='finished') return false;
    const old=g.history.pop(), history=g.history;
    if(Number.isInteger(old.movesLength)) {
      const {movesLength,positionsLength,...state}=old;
      g.moves.length=movesLength;g.positions.length=positionsLength;
      Object.assign(g,state,{history});
    } else Object.assign(g,old,{history});
    return true;
  }
  function toggleDead(g,id) {
    if (g.phase!=='scoring' || !g.board[id]) return;
    const chain=group(g.board,topology(g.config),id).stones, dead=new Set(g.dead), remove=dead.has(id);
    chain.forEach(s=>remove ? dead.delete(s) : dead.add(s)); g.dead=[...dead]; g.accepted=[];
  }
  function score(g) {
    const graph=topology(g.config), board=[...g.board], owner=Array(board.length).fill(0), stones=[0,0,0], territory=[0,0,0];
    g.dead.forEach(id=>board[id]=0);
    const visited=new Set();
    for (let id=0;id<board.length;id++) {
      if (!graph.active[id]) continue;
      if (board[id]) { stones[board[id]]++; owner[id]=board[id]; continue; }
      if (visited.has(id)) continue;
      const region=[id], border=new Set(), todo=[id]; visited.add(id);
      while(todo.length) for(const p of graph.neighbors[todo.pop()]) {
        if(board[p]) border.add(board[p]);
        else if(!visited.has(p)) { visited.add(p); region.push(p); todo.push(p); }
      }
      if(border.size===1) { const color=[...border][0]; territory[color]+=region.length; region.forEach(p=>owner[p]=color); }
    }
    const black=stones[1]+territory[1], white=stones[2]+territory[2]+Number(g.config.komi);
    return {black,white,stones,territory,owner,neutral:graph.active.filter(Boolean).length-stones[1]-stones[2]-territory[1]-territory[2],winner:black===white?0:black>white?1:2,margin:Math.abs(black-white)};
  }
  function accept(g,color) {
    if(g.phase!=='scoring' || ![1,2].includes(color) || g.accepted.includes(color)) return;
    g.accepted.push(color);
    if(g.accepted.length===2) { g.result={...score(g),reason:'score'}; g.phase='finished'; }
  }
  function resume(g) { if(g.phase==='scoring') { g.phase='play'; g.passes=0; g.dead=[]; g.accepted=[]; } }
  function resign(g) { if(g.phase==='play') { g.result={winner:3-g.turn,reason:'resign'}; g.phase='finished'; } }
  const api={topology,group,create,play,pass,undo,toggleDead,score,accept,resume,resign};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.GoEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
