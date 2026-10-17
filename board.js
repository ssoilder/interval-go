(function(root) {
  'use strict';
  const letters='ABCDEFGHJKLMNOPQRSTUVWXYZ';
  function coordinate(id,n) { return letters[id%n]+(n-Math.floor(id/n)); }
  function render(config, options={}) {
    const n=config.size, tri=config.mode==='triangle', graph=GoEngine.topology(config);
    const step=568/(n-1+(tri?.5:0)), h=tri?step*Math.sqrt(3)/2:step, height=h*(n-1), y0=(680-height)/2;
    const point=id=>({x:56+(id%n+(tri?Math.floor(id/n)%2*.5:0))*step,y:y0+Math.floor(id/n)*h});
    const radius=step*.455, board=options.board||Array(n*n).fill(0), dead=new Set(options.dead||[]);
    let cuts='',lines='',stars='',stones='',labels='',hits='',territory='';
    graph.active.forEach((on,id)=>{
      const {x,y}=point(id);
      if(!on) {
        if(tri) {
          const a=step/2+.4,b=step/(2*Math.sqrt(3))+.4;
          cuts+=`<polygon points="${x-a},${y-b} ${x},${y-2*b} ${x+a},${y-b} ${x+a},${y+b} ${x},${y+2*b} ${x-a},${y+b}" fill="black"/>`;
          if(Math.floor(id/n)===0) cuts+=`<rect x="${x-a}" y="22" width="${2*a}" height="${y-22}" fill="black"/>`;
          if(Math.floor(id/n)===n-1) cuts+=`<rect x="${x-a}" y="${y}" width="${2*a}" height="${658-y}" fill="black"/>`;
          if(id%n===0) cuts+=`<rect x="22" y="${y-b}" width="${x-22}" height="${2*b}" fill="black"/>`;
          if(id%n===n-1) cuts+=`<rect x="${x}" y="${y-b}" width="${658-x}" height="${2*b}" fill="black"/>`;
        }
        else cuts+=`<rect x="${id%n===0?22:x-step/2}" y="${Math.floor(id/n)===0?22:y-step/2}" width="${id%n===0||id%n===n-1?step/2+35:step+.3}" height="${Math.floor(id/n)===0||Math.floor(id/n)===n-1?step/2+35:step+.3}" fill="black"/>`;
        return;
      }
      for(const neighbor of graph.neighbors[id]) if(neighbor>id) { const p=point(neighbor); lines+=`<path d="M${x} ${y}L${p.x} ${p.y}"/>`; }
      if(!tri && [9,13,19].includes(n)) {
        const star=n===9?[2,4,6]:n===13?[3,6,9]:[3,9,15];
        if(star.includes(id%n)&&star.includes(Math.floor(id/n))) stars+=`<circle cx="${x}" cy="${y}" r="${n===19?2.6:3.1}"/>`;
      }
      if(options.owner && !board[id] && options.owner[id]) territory+=`<rect x="${x-step*.11}" y="${y-step*.11}" width="${step*.22}" height="${step*.22}" fill="${options.owner[id]===1?'#252922':'#fffdf5'}" stroke="#665e49" stroke-width=".5"/>`;
      if(board[id]) {
        const color=board[id], dim=dead.has(id);
        stones+=`<g class="stone ${dim?'dead':''}"><circle cx="${x}" cy="${y+1.7}" r="${radius}" fill="#000" opacity=".18" filter="url(#stoneShadow)"/><circle cx="${x}" cy="${y}" r="${radius}" fill="url(#${color===1?'blackStone':'whiteStone'})" stroke="${color===1?'#272822':'#c8c5b9'}" stroke-width=".6"/>`;
        if(options.numbers && options.moveNumbers?.[id]) stones+=`<text class="move-number" x="${x}" y="${y}" font-size="${radius*.8}" fill="${color===1?'#fff':'#30362c'}">${options.moveNumbers[id]}</text>`;
        else if(id===options.last) stones+=`<circle cx="${x}" cy="${y}" r="${radius*.24}" fill="none" stroke="${color===1?'#fff':'#53634a'}" stroke-width="1.5"/>`;
        if(dim) stones+=`<path d="M${x-radius*.35} ${y-radius*.35}l${radius*.7} ${radius*.7}m0 ${-radius*.7}l${-radius*.7} ${radius*.7}" stroke="#a04235" stroke-width="2.5"/>`;
        stones+='</g>';
      }
      if(options.interactive) {
        const label=coordinate(id,n)+(board[id]?(options.lang==='en'?(board[id]===1?' Black':' White'):(board[id]===1?' 黑子':' 白子')):'');
        hits+=`<g class="point ${board[id]?'occupied':''}" role="button" tabindex="${id===(options.focus??graph.active.indexOf(true))?'0':'-1'}" aria-label="${label}" data-point="${id}"><circle cx="${x}" cy="${y}" r="${step*.48}" fill="transparent"/><circle class="ghost" cx="${x}" cy="${y}" r="${radius}" fill="${options.turn===1?'#22271f':'#fffdf5'}"/></g>`;
      }
    });
    for(let c=0;c<n;c++) { const p=point(c); if(graph.active[c]) labels+=`<text x="${p.x}" y="${y0-22}">${letters[c]}</text>`; }
    for(let r=0;r<n;r++) { const p=point(r*n); if(graph.active[r*n]) labels+=`<text x="31" y="${p.y+3}">${n-r}</text>`; }
    return `<svg class="go-board" role="${options.interactive?'group':'img'}" viewBox="0 0 680 680" xmlns="http://www.w3.org/2000/svg" aria-label="${options.lang==='en'?'Go board':'围棋棋盘'}">
      <defs>
        <linearGradient id="wood" x2=".8" y2="1"><stop stop-color="#e9cb95"/><stop offset=".5" stop-color="#e6c38b"/><stop offset="1" stop-color="#ddba80"/></linearGradient>
        <pattern id="grain" width="39" height="680" patternUnits="userSpaceOnUse"><path d="M2 0q4 170 0 340T3 680M9 0q-3 240 0 400T9 680M24 0q5 140 1 300T26 680M31 0q-2 190 0 360T31 680" stroke="#8f672c" stroke-opacity=".07" fill="none" stroke-width=".7"/></pattern>
        <radialGradient id="blackStone" cx="32%" cy="25%" r="75%"><stop stop-color="#53554b"/><stop offset=".45" stop-color="#292c25"/><stop offset="1" stop-color="#131811"/></radialGradient>
        <radialGradient id="whiteStone" cx="33%" cy="23%" r="78%"><stop stop-color="#fffffb"/><stop offset=".55" stop-color="#f3f1e9"/><stop offset="1" stop-color="#d6d3c8"/></radialGradient>
        <filter id="stoneShadow" x="-40%" y="-40%" width="180%" height="190%"><feGaussianBlur stdDeviation="2.5"/></filter>
        <mask id="cutout"><rect x="22" y="22" width="636" height="636" rx="9" fill="white"/>${cuts}</mask>
      </defs>
      <g class="wood-surface" mask="url(#cutout)"><rect x="22" y="22" width="636" height="636" rx="9" fill="url(#wood)"/><rect x="22" y="22" width="636" height="636" fill="url(#grain)"/><rect x="25" y="25" width="630" height="630" rx="7" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/></g>
      <g fill="none" stroke="#5d5138" stroke-width=".85" opacity=".85">${lines}</g><g fill="#4d4632">${stars}</g>
      <g class="coordinates" fill="#766548" font-size="10" text-anchor="middle">${labels}</g>${territory}${stones}${hits}
    </svg>`;
  }
  root.GoBoard={render,coordinate};
})(globalThis);
