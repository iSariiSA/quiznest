// Navigate through the same creation and settings entry points used in the app.
async function command(page,name){
  if(name==='Settings')return page.getByRole('button',{name:'Settings',exact:true}).click();
  if(name==='New course…'){
    await page.getByRole('button',{name:'Library actions',exact:true}).click();
    return page.getByRole('menuitem',{name,exact:true}).click();
  }
  if(name==='New unit…'){
    await page.getByRole('button',{name:'Course actions',exact:true}).click();
    return page.getByRole('menuitem',{name,exact:true}).click();
  }
  if(name==='Discard attempt…'){
    await page.getByRole('button',{name:'Quiz actions',exact:true}).click();
    return page.getByRole('menuitem',{name,exact:true}).click();
  }
  if(name==='Help'){
    await command(page,'Settings');
    return page.getByRole('button',{name:'Open help',exact:true}).click();
  }
  if(!['New quiz…','Prepare a quiz…','Import…'].includes(name))throw new Error(`Unknown UI command: ${name}`);
  await page.locator('.top-actions [data-action="newQuiz"], .breadcrumbs [data-action="newQuiz"]').click();
  if(name==='Prepare a quiz…')await page.getByRole('button',{name:'Prepare with an agent',exact:true}).click();
  if(name==='Import…')await page.getByRole('button',{name:'Import file',exact:true}).click();
}
module.exports={command};
