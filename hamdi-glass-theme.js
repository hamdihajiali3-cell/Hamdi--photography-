/* Local, optional presentation preference. Booking and Nur are unaffected. */
(()=>{'use strict';
  const key='hamdi-glass-theme';
  const themes=new Set(['luxury','soft']);
  let stored='luxury';
  try{const value=localStorage.getItem(key);if(themes.has(value))stored=value}catch{}
  document.documentElement.dataset.glassTheme=stored;
  function init(){
    const switcher=document.querySelector('.glass-theme-switch');
    if(!switcher)return;
    const buttons=[...switcher.querySelectorAll('button[data-glass-select]')];
    const update=(value)=>{
      if(!themes.has(value))return;
      document.documentElement.dataset.glassTheme=value;
      for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.glassSelect===value));
    };
    for(const button of buttons)button.addEventListener('click',()=>{
      const value=button.dataset.glassSelect;
      update(value);
      try{localStorage.setItem(key,value)}catch{}
    });
    update(stored);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
