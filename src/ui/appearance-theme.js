const systemAppearance=matchMedia('(prefers-color-scheme: dark)');
function applyAppearance(){
 const root=document.documentElement;root.dataset.theme=displayPrefs.theme==='system'?(systemAppearance.matches?'dark':'light'):(displayPrefs.theme||'dark');root.dataset.accent=displayPrefs.accent||'sage';root.dataset.density=displayPrefs.density||'comfortable';root.style.setProperty('--text-factor',String((displayPrefs.textScale||100)/100));
 applyQuizAppearance();
}
systemAppearance.addEventListener('change',applyAppearance);
