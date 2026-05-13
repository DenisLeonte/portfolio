import"./ViewTransitions.astro_astro_type_script_index_0_lang.lLIxE8sI.js";import"./hoisted.CWZBxjdK.js";function f(){const t=document.getElementById("hero-time");t&&(t.textContent=new Date().toLocaleTimeString("en-GB",{hour12:!1})+" EET")}f();setInterval(f,1e3);const y=[`   ░▒▓██████▓▒░
  ░▒▓█▓▒░░▒▓█▓▒░
  ░▒▓█▓▒░░▒▓█▓▒░
  ░▒▓█▓▒░░▒▓█▓▒░
  ░▒▓█▓▒░░▒▓█▓▒░
   ░▒▓██████▓▒░`,`   ▒▓██████▓░
  ▓█▓▒░░▒▓█▓░
  █▓▒░░▒▓█▓▒
  ▓▒░░▒▓█▓▒░
  ▒░░▒▓█▓▒░▒
   ▓██████▓▒`,`   ▓████████░
  █░░▒▓▓▓▒░█
  █░▒▓██▓▒░░
  █░░▒▓▓▒░░░
  █▓▒░░░▒▓░░
   ████████▓`];let c=0;setInterval(()=>{c=(c+1)%y.length;const t=document.getElementById("hero-ascii");t&&(t.textContent=y[c])},600);const g=window.matchMedia("(hover: none) and (pointer: coarse)").matches;let p=10;g||document.querySelectorAll("[data-win]").forEach(t=>{const e=t,n=e.querySelector(".win-header"),o=e.querySelector(".win-x");let r=!1,a=0,d=0,i=0,l=0;n?.addEventListener("mousedown",s=>{if(s.target.classList.contains("win-x"))return;r=!0,p++,e.style.zIndex=String(p);const u=e.getBoundingClientRect(),m=document.getElementById("desktop-board").getBoundingClientRect();i=u.left-m.left,l=u.top-m.top,a=s.clientX,d=s.clientY,e.style.left=i+"px",e.style.top=l+"px",e.style.right="auto",s.preventDefault()}),window.addEventListener("mousemove",s=>{r&&(e.style.left=i+(s.clientX-a)+"px",e.style.top=l+(s.clientY-d)+"px")}),window.addEventListener("mouseup",()=>{r=!1}),o?.addEventListener("click",()=>{e.style.transition="transform 0.2s, opacity 0.2s",e.style.transform="scale(0.8)",e.style.opacity="0",setTimeout(()=>{e.style.display="none",setTimeout(()=>{e.style.display="",e.style.transform="",e.style.opacity="",e.style.transition=""},2500)},200)})});document.addEventListener("astro:page-load",()=>{const t=document.getElementById("skills");if(!t)return;const e=new IntersectionObserver(n=>{n[0].isIntersecting&&(document.querySelectorAll(".skill-bar").forEach((o,r)=>{setTimeout(()=>o.classList.add("animate"),r*60)}),e.disconnect())},{threshold:.15});e.observe(t)});document.querySelectorAll(".project-row").forEach(t=>{const e=t.querySelector(".project-preview");e&&t.addEventListener("mousemove",n=>{const o=t.getBoundingClientRect();e.style.left=n.clientX-o.left-160+"px",e.style.top=n.clientY-o.top-220+"px"})});document.addEventListener("astro:page-load",()=>{const t=document.querySelectorAll(".timeline-row"),e=new IntersectionObserver(n=>{n.forEach(o=>{o.isIntersecting&&(o.target.classList.add("visible"),e.unobserve(o.target))})},{threshold:.15});t.forEach(n=>e.observe(n))});
